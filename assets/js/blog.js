const blogList = document.querySelector("[data-blog-list]");
const blogArticle = document.querySelector("[data-blog-article]");

const createTextElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
};

const renderTags = (tags = []) => {
  const tagList = document.createElement("div");
  tagList.className = "blog-tags";

  for (const tag of tags) {
    tagList.append(createTextElement("span", "", tag));
  }

  return tagList;
};

const renderBlogCard = (post) => {
  const card = document.createElement("a");
  card.className = "blog-card";
  card.href = `blog-post.html?post=${encodeURIComponent(post.slug)}`;

  card.append(createTextElement("p", "blog-card__category", post.category));
  card.append(createTextElement("h3", "", post.title));
  card.append(createTextElement("p", "", post.summary));

  const meta = document.createElement("div");
  meta.className = "blog-card__meta";
  meta.append(
    createTextElement("span", "", post.date),
    createTextElement("span", "", post.readingTime),
  );
  card.append(meta);
  card.append(renderTags(post.tags));

  return card;
};

const loadBlogIndex = async () => {
  if (!blogList) {
    return;
  }

  try {
    const response = await fetch("assets/data/blog/posts.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load posts: ${response.status}`);
    }

    const posts = await response.json();
    blogList.replaceChildren(...posts.map(renderBlogCard));
  } catch (error) {
    console.error(error);
    blogList.textContent = "Unable to load blog posts right now.";
  }
};

const renderArticleSection = (section) => {
  const fragment = document.createDocumentFragment();
  fragment.append(createTextElement("h2", "", section.heading));

  for (const paragraph of section.paragraphs || []) {
    fragment.append(createTextElement("p", "", paragraph));
  }

  if (section.points?.length) {
    const list = document.createElement("ul");
    for (const point of section.points) {
      list.append(createTextElement("li", "", point));
    }
    fragment.append(list);
  }

  return fragment;
};

const renderArticle = (post) => {
  const header = document.createElement("header");
  header.className = "blog-article__header";
  header.append(createTextElement("p", "blog-article__category", post.category));
  header.append(createTextElement("h1", "blog-article__title", post.title));
  header.append(createTextElement("p", "blog-article__summary", post.summary));

  const meta = document.createElement("div");
  meta.className = "blog-article__meta";
  meta.append(
    createTextElement("span", "", post.date),
    createTextElement("span", "", post.readingTime),
  );
  header.append(meta);
  header.append(renderTags(post.tags));

  const body = document.createElement("article");
  body.className = "blog-article__body";
  for (const section of post.sections || []) {
    body.append(renderArticleSection(section));
  }

  blogArticle.replaceChildren(header, body);
  document.title = `Sheng Cao | ${post.title}`;

  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([blogArticle]).catch((error) => {
      console.error("MathJax typesetting failed:", error);
    });
  }
};

const loadBlogArticle = async () => {
  if (!blogArticle) {
    return;
  }

  const slug = new URLSearchParams(window.location.search).get("post");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    blogArticle.replaceChildren(createTextElement("p", "blog-error", "Article not found."));
    return;
  }

  try {
    const response = await fetch(`assets/data/blog/${slug}.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load article: ${response.status}`);
    }

    const post = await response.json();
    renderArticle(post);
  } catch (error) {
    console.error(error);
    blogArticle.replaceChildren(createTextElement("p", "blog-error", "Unable to load this article right now."));
  }
};

loadBlogIndex();
loadBlogArticle();
