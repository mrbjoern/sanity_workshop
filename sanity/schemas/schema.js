import createSchema from "part:@sanity/base/schema-creator";

import schemaTypes from "all:part:@sanity/base/schema-type";
import portableText from "./portableText";
import author from "./author";
import article from "./article";

export default createSchema({
  name: "default",
  types: schemaTypes.concat([portableText, author, article]),
});
