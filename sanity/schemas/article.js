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
