const blogList = document.querySelector("[data-blog-list]");
const blogArticle = document.querySelector("[data-blog-article]");
const blogHero = document.querySelector("[data-blog-hero]");
const blogIndex = document.querySelector("[data-blog-index]");
const returnHomeLink = document.querySelector(".return-home");
const BLOG_CATEGORY_STATE_KEY = "blog-category-state";

const createTextElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
};

const readCategoryState = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(BLOG_CATEGORY_STATE_KEY) || "{}");
  } catch (error) {
    console.error("Unable to read blog category state:", error);
    return {};
  }
};

const writeCategoryState = (state) => {
  try {
    window.sessionStorage.setItem(BLOG_CATEGORY_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Unable to save blog category state:", error);
  }
};

const fetchHtmlFragment = async (url) => {
  const response = await fetch(url, { cache: "default" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  const template = document.createElement("template");
  template.innerHTML = await response.text();
  return template.content;
};

const renderTags = (tags = []) => {
  const tagList = document.createElement("div");
  tagList.className = "blog-tags";

  for (const tag of tags) {
    tagList.append(createTextElement("span", "", tag));
  }

  return tagList;
};

const parsePostPreview = (slug, fragment) => {
  const metaItems = [...fragment.querySelectorAll(".blog-article__meta span")].map((item) => item.textContent.trim());

  return {
    slug,
    category: fragment.querySelector(".blog-article__category")?.textContent.trim() || "Untitled",
    title: fragment.querySelector(".blog-article__title")?.textContent.trim() || slug,
    summary: fragment.querySelector(".blog-article__summary")?.textContent.trim() || "",
    date: metaItems[0] || "",
    readingTime: metaItems[1] || "",
    tags: [...fragment.querySelectorAll(".blog-tags span")].map((tag) => tag.textContent.trim()),
  };
};

const renderBlogCard = (post) => {
  const card = document.createElement("a");
  card.className = "blog-card";
  card.href = `blog.html?post=${encodeURIComponent(post.slug)}`;

  card.append(createTextElement("h3", "", post.title));

  if (post.summary) {
    card.append(createTextElement("p", "", post.summary));
  }

  const meta = document.createElement("div");
  meta.className = "blog-card__meta";
  if (post.date) {
    meta.append(createTextElement("span", "", post.date));
  }
  if (post.readingTime) {
    meta.append(createTextElement("span", "", post.readingTime));
  }
  if (meta.children.length) {
    card.append(meta);
  }

  if (post.tags.length) {
    card.append(renderTags(post.tags));
  }

  return card;
};

const renderCategorySection = (category, posts) => {
  const details = document.createElement("details");
  details.className = "blog-category";
  details.dataset.category = category;

  const summary = document.createElement("summary");
  summary.className = "blog-category__summary";
  summary.append(createTextElement("span", "blog-category__label", category));
  summary.append(
    createTextElement(
      "span",
      "blog-category__count",
      `${posts.length} post${posts.length === 1 ? "" : "s"}`,
    ),
  );
  details.append(summary);

  const postList = document.createElement("div");
  postList.className = "blog-category__posts";
  postList.append(...posts.map(renderBlogCard));
  details.append(postList);

  return details;
};

const getPostSlugs = () => {
  return (blogList?.dataset.postSlugs || "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
};

const loadBlogIndex = async () => {
  if (!blogList) {
    return;
  }

  const activeSlug = new URLSearchParams(window.location.search).get("post")?.trim();
  if (activeSlug) {
    return;
  }

  try {
    const postPreviews = await Promise.all(
      getPostSlugs().map(async (slug) => {
        const fragment = await fetchHtmlFragment(`assets/data/blog/${slug}.html`);
        return parsePostPreview(slug, fragment);
      }),
    );

    const groupedPosts = new Map();
    for (const post of postPreviews) {
      if (!groupedPosts.has(post.category)) {
        groupedPosts.set(post.category, []);
      }
      groupedPosts.get(post.category).push(post);
    }

    blogList.replaceChildren(
      ...[...groupedPosts.entries()].map(([category, posts]) => renderCategorySection(category, posts)),
    );
    restoreBlogCategoryState();
  } catch (error) {
    console.error(error);
    blogList.textContent = "Unable to load blog posts right now.";
  }
};

const restoreBlogCategoryState = () => {
  const categoryState = readCategoryState();

  for (const details of blogList.querySelectorAll(".blog-category")) {
    const categoryKey = details.dataset.category || details.querySelector(".blog-category__label")?.textContent || "Untitled";
    details.open = Boolean(categoryState[categoryKey]);
    details.addEventListener("toggle", () => {
      const nextState = readCategoryState();
      nextState[categoryKey] = details.open;
      writeCategoryState(nextState);
    });
  }
};

const loadBlogArticle = async () => {
  if (!blogArticle) {
    return;
  }

  const slug = new URLSearchParams(window.location.search).get("post")?.trim();
  if (!slug || !/^[A-Za-z0-9-]+$/.test(slug)) {
    return;
  }

  blogHero?.setAttribute("hidden", "");
  blogIndex?.setAttribute("hidden", "");
  blogArticle.removeAttribute("hidden");
  if (returnHomeLink) {
    returnHomeLink.href = "blog.html";
    returnHomeLink.setAttribute("aria-label", "Return to blog");
  }

  try {
    const fragment = await fetchHtmlFragment(`assets/data/blog/${slug}.html`);
    blogArticle.replaceChildren(fragment);

    const title = blogArticle.querySelector(".blog-article__title")?.textContent;
    if (title) {
      document.title = `Sheng Cao | ${title}`;
    }

    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([blogArticle]).catch((error) => {
        console.error("MathJax typesetting failed:", error);
      });
    }
  } catch (error) {
    console.error(error);
    blogArticle.replaceChildren(createTextElement("p", "blog-error", "Unable to load this article right now."));
  }
};

loadBlogIndex();
loadBlogArticle();
