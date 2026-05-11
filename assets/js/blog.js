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

if (blogList) {
  restoreBlogCategoryState();
}
loadBlogArticle();
