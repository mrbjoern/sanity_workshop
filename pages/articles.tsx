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
    articles: { title: string; content: any; authorNames: string[] }[];
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
      {props.data.articles.map((article) => {
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
