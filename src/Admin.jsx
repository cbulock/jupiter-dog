import CMS from "netlify-cms";

// Now the registry is available via the CMS object.
CMS.registerPreviewTemplate("default", Default);

export default () => {
  return null;
};
