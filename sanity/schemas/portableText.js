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
