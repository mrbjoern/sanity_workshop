# Sanity workshop

## Sette opp nextjs

`npx create-next-app@latest --typescript`

Velge et passende navn på nextjs-appen

`cd navn_på_ny_app`

`npm install --save next-sanity @portabletext/react @sanity/image-url`

## Sette opp Sanity

`mkdir sanity`
`npx @sanity/cli init`

- Velge "Create new project"
- Velge et passende prosjektnavn
- (Y) til default dataset configuration
- (Enter) på output path
- Velg "Clean project with no predefined schemas"

`npm install --save @sanity/cli`

Sanity studio kan startes med `npm start`. Studio kjører som default på port 3333.

## Sette opp sanity-client i nextjs-app

Tilbake i nextjs-appen vår lager vi config for å sette opp sanity-client.

```js
// lib/config.ts
import { ClientConfig } from "next-sanity";

export const config: ClientConfig = {
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  apiVersion: "2021-10-21",
  useCdn: process.env.NODE_ENV === "production",
};
```

Env-variabler for dataset og projectId kan vi legge i en egen `.env` på rot. Verdiene finner vi i `./sanity/sanity.json`

```js
// lib/sanity.ts
import {
  createPreviewSubscriptionHook,
  createCurrentUserHook,
} from "next-sanity";
import createImageUrlBuilder from "@sanity/image-url";
import { config } from "./config";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

/**
 * Set up a helper function for generating Image URLs with only the asset reference data in your documents.
 * Read more: https://www.sanity.io/docs/image-url
 **/
export const urlFor = (source: SanityImageSource) =>
  createImageUrlBuilder(config).image(source);

// Set up the live preview subscription hook
export const usePreviewSubscription = createPreviewSubscriptionHook(config);

// Helper function for using the current logged in user account
export const useCurrentUser = createCurrentUserHook(config);
```

```js
// lib/sanity.server.ts
import { createClient } from "next-sanity";
import { config } from "./config";

// Set up the client for fetching data in the getProps page functions
export const sanityClient = createClient(config);

// Set up a preview client with serverless authentication for drafts
export const previewClient = createClient({
  ...config,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Helper function for easily switching between normal client and preview client
export const getClient = (usePreview: boolean) =>
  usePreview ? previewClient : sanityClient;
```

## Definere schema for dokumenttypene våre i Sanity

I mappen schemas kan vi definere ulike dokumenttyper i Sanity. Et schema kan eks være en artikkel, forfatter, eller et produkt, og de består gjerne av en eller flere ulike `fields`.

```js
// schemas/article.js
export default {
  name: "article",
  title: "Artikkel",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Tittel",
      type: "string",
    },
    {
      name: "authors",
      title: "Forfattere",
      type: "array",
      of: [{ type: "reference", to: [{ type: "author" }] }],
    },
    {
      name: "content",
      title: "Innhold",
      type: "portableText",
    },
  ],
};
```

I tillegg skal vi lage et dokument for `author`. En forfatter bør ha et navn og kanskje en biografi / kort beskrivelse.

`portableText` er et spesielt type objekt for fritekst-innhold. Denne kan eks inneholde formatert tekst, inline bilder, lenker, punktlister etc. `portableText` kan rendres med et eget komponent vi importerer fra `@portabletext/react`.

```js
export default {
  name: "portableText",
  title: "Tekstblokk",
  type: "array",
  of: [
    {
      type: "block",
      title: "Block",
      styles: [
        {
          title: "Normal",
          value: "normal",
        },
        { title: "H2", value: "h2" },
      ],
      lists: [{ title: "Bullet", value: "bullet" }],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
      },
    },
    {
      type: "image",
      options: { hotspot: true },
    },
  ],
};
```

Alle schemaene vi har definert må importeres i `schema.js`

```js
// schema.js
import createSchema from "part:@sanity/base/schema-creator";

import schemaTypes from "all:part:@sanity/base/schema-type";
import portableText from "./portableText";
import author from "./author";
import article from "./article";

export default createSchema({
  name: "default",
  types: schemaTypes.concat([portableText, author, article]),
});
```

## Hente data fra Sanity

Sanity har laget sitt eget spørrespråk (groq) som vi bruker for hente og filtrere data fra APIene deres. Groq lar oss spesifisere dokumenttypen vi spør etter (`_type == "article"`), og hvilken del av innholdet vi er interessert i. Vi kan også hente referanser fra andre dokuementer, eks navn fra `authors`.

```js
// pages/articles.tsx
const query = groq`{
    "articles": *[_type == "article"]{
        title,
        content,
        "authorNames": authors[]->name
    }
}
`;
```

I nextjs vil vi gjerne hente inn data fra Sanity gjennom `getStaticProps`, slik at vi slipper å hente data fra Sanity ved hver eneste sidevisning.

```js
interface StaticProps {
  props: Props;
  revalidate: number;
}

export const getStaticProps = async ({
  preview = false,
}): Promise<StaticProps> => {
  const params = {};
  const data = await sanityClient.fetch(query, params);

  return {
    props: { data, params, preview },
    revalidate: 60,
  };
};
```

Fullstendig eksempel på side som viser artikler fra Sanity:

```js
import { groq } from "next-sanity";
import { PortableText } from "@portabletext/react";
import { usePreviewSubscription } from "../lib/sanity";
import { sanityClient } from "../lib/sanity.server";

const query = groq`{
    "articles": *[_type == "article"]{
        title,
        content,
        "authorNames": authors[]->name
    }
}
`;

interface Props {
  data: {
    articles: { title: string, content: any, authorNames: string[] }[],
  };
  params: {};
  preview: boolean;
}

const Articles = (props: Props) => {
  const { data } = usePreviewSubscription(query, {
    initialData: props.data,
    params: props.params,
    enabled: props.preview,
  });

  return (
    <div>
      {data.articles.map((article) => {
        return (
          <article key={article.title}>
            <h1>{article.title}</h1>
            Skrevet av: {article.authorNames.join(", ")}
            <PortableText value={article.content} />
          </article>
        );
      })}
    </div>
  );
};

interface StaticProps {
  props: Props;
  revalidate: number;
}

export const getStaticProps = async ({
  preview = false,
}): Promise<StaticProps> => {
  const params = {};
  const data = await sanityClient.fetch(query, params);

  return {
    props: { data, params, preview },
    revalidate: 60,
  };
};

export default Articles;
```
