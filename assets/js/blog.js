const blogList = document.querySelector("[data-blog-list]");
const blogArticle = document.querySelector("[data-blog-article]");
const blogHero = document.querySelector("[data-blog-hero]");
const blogIndex = document.querySelector("[data-blog-index]");
const returnHomeLink = document.querySelector(".return-home");
const BLOG_CATEGORY_STATE_KEY = "blog-category-state";
const REFERENCE_PATTERN = /\[\[(fig|tbl):([a-z0-9-]+)\]\]/gi;

const createTextElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
};

const appendRichText = (container, text, referenceMap = {}) => {
  const content = text ?? "";
  let lastIndex = 0;

  for (const match of content.matchAll(REFERENCE_PATTERN)) {
    const [token, type, tag] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) {
      container.append(content.slice(lastIndex, start));
    }

    const reference = referenceMap[`${type}:${tag}`];
    const referenceText = reference ? `${reference.label} ${reference.number}` : token;
    const ref = document.createElement("span");
    ref.className = "blog-inline-ref";
    ref.textContent = referenceText;
    container.append(ref);
    lastIndex = start + token.length;
  }

  if (lastIndex < content.length) {
    container.append(content.slice(lastIndex));
  }
};

const renderTags = (tags = []) => {
  const tagList = document.createElement("div");
  tagList.className = "blog-tags";

  for (const tag of tags) {
    tagList.append(createTextElement("span", "", tag));
  }

  return tagList;
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

const applyOptionalStyle = (element, property, value) => {
  if (value !== undefined && value !== null && value !== "") {
    element.style[property] = value;
  }
};

const applyAlignmentClass = (element, align, prefix) => {
  if (align) {
    element.classList.add(`${prefix}--align-${align}`);
  }
};

const collectReferenceMap = (post) => {
  const referenceMap = {};
  let figureCount = 0;
  let tableCount = 0;

  for (const section of post.sections || []) {
    const blocks = section.content || [];
    for (const block of blocks) {
      if ((block.type === "figure" || block.type === "figure-group") && block.tag) {
        figureCount += 1;
        referenceMap[`fig:${block.tag}`] = {
          label: "Figure",
          number: figureCount,
        };
      }

      if (block.type === "table" && block.tag) {
        tableCount += 1;
        referenceMap[`tbl:${block.tag}`] = {
          label: "Table",
          number: tableCount,
        };
      }
    }
  }

  return referenceMap;
};

const renderBlogCard = (post) => {
  const card = document.createElement("a");
  card.className = "blog-card";
  card.href = `blog.html?post=${encodeURIComponent(post.slug)}`;

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

const renderCategorySection = (group) => {
  const details = document.createElement("details");
  details.className = "blog-category";
  const categoryKey = group.category || "Untitled";
  const categoryState = readCategoryState();
  if (categoryState[categoryKey]) {
    details.open = true;
  }

  const summary = document.createElement("summary");
  summary.className = "blog-category__summary";
  summary.append(createTextElement("span", "blog-category__label", categoryKey));
  summary.append(
    createTextElement(
      "span",
      "blog-category__count",
      `${group.posts?.length || 0} post${group.posts?.length === 1 ? "" : "s"}`,
    ),
  );
  details.append(summary);

  const postList = document.createElement("div");
  postList.className = "blog-category__posts";
  postList.append(...(group.posts || []).map(renderBlogCard));
  details.append(postList);
  details.addEventListener("toggle", () => {
    const nextState = readCategoryState();
    nextState[categoryKey] = details.open;
    writeCategoryState(nextState);
  });

  return details;
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

    const postGroups = await response.json();
    blogList.replaceChildren(...postGroups.map(renderCategorySection));
  } catch (error) {
    console.error(error);
    blogList.textContent = "Unable to load blog posts right now.";
  }
};

const renderParagraphBlock = (block, referenceMap) => {
  const paragraph = document.createElement("p");
  appendRichText(paragraph, block.text || "", referenceMap);
  return paragraph;
};

const renderListBlock = (block, referenceMap) => {
  const list = document.createElement(block.ordered ? "ol" : "ul");
  for (const itemText of block.items || []) {
    const item = document.createElement("li");
    appendRichText(item, itemText, referenceMap);
    list.append(item);
  }
  return list;
};

const renderFigureBlock = (block, referenceMap) => {
  const figure = document.createElement("figure");
  figure.className = "blog-figure";
  applyAlignmentClass(figure, block.align, "blog-figure");
  applyOptionalStyle(figure, "width", block.width);
  applyOptionalStyle(figure, "maxWidth", block.maxWidth);

  const image = document.createElement("img");
  image.className = "blog-figure__image";
  image.src = block.src;
  image.alt = block.alt || "";
  image.loading = "lazy";
  image.decoding = "async";
  applyOptionalStyle(image, "width", block.imageWidth);
  applyOptionalStyle(image, "maxWidth", block.imageMaxWidth);
  figure.append(image);

  const figureRef = block.tag ? referenceMap[`fig:${block.tag}`] : null;
  if (block.caption && figureRef) {
    const caption = document.createElement("figcaption");
    caption.className = "blog-figure__caption";
    const prefix = document.createElement("span");
    prefix.className = "blog-caption__label";
    prefix.textContent = `${figureRef.label} ${figureRef.number}. `;
    caption.append(prefix);
    appendRichText(caption, block.caption, referenceMap);
    figure.append(caption);
  }

  return figure;
};

const renderFigureGroupBlock = (block, referenceMap) => {
  const figure = document.createElement("figure");
  figure.className = "blog-figure blog-figure-group";
  applyAlignmentClass(figure, block.align, "blog-figure");
  applyOptionalStyle(figure, "width", block.width);
  applyOptionalStyle(figure, "maxWidth", block.maxWidth);

  const gallery = document.createElement("div");
  gallery.className = "blog-figure-group__grid";
  const columns = block.columns || (block.images?.length >= 3 ? 3 : 2);
  gallery.style.gridTemplateColumns = `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`;

  for (const imageBlock of block.images || []) {
    const item = document.createElement("div");
    item.className = "blog-figure-group__item";
    applyOptionalStyle(item, "gridColumn", imageBlock.gridColumn);
    applyOptionalStyle(item, "gridRow", imageBlock.gridRow);

    const image = document.createElement("img");
    image.className = "blog-figure-group__image";
    image.src = imageBlock.src;
    image.alt = imageBlock.alt || "";
    image.loading = "lazy";
    image.decoding = "async";
    applyOptionalStyle(image, "width", imageBlock.width);
    applyOptionalStyle(image, "maxWidth", imageBlock.maxWidth);
    item.append(image);

    if (imageBlock.caption) {
      const note = document.createElement("p");
      note.className = "blog-figure-group__item-caption";
      appendRichText(note, imageBlock.caption, referenceMap);
      item.append(note);
    }

    gallery.append(item);
  }

  figure.append(gallery);

  const figureRef = block.tag ? referenceMap[`fig:${block.tag}`] : null;
  if (block.caption && figureRef) {
    const caption = document.createElement("figcaption");
    caption.className = "blog-figure__caption";
    const prefix = document.createElement("span");
    prefix.className = "blog-caption__label";
    prefix.textContent = `${figureRef.label} ${figureRef.number}. `;
    caption.append(prefix);
    appendRichText(caption, block.caption, referenceMap);
    figure.append(caption);
  }

  return figure;
};

const normalizeCell = (cellData) => {
  if (typeof cellData === "object" && cellData !== null && !Array.isArray(cellData)) {
    return cellData;
  }

  return { text: String(cellData ?? "") };
};

const renderTableBlock = (block, referenceMap) => {
  const figure = document.createElement("figure");
  figure.className = "blog-table-figure";
  applyAlignmentClass(figure, block.align, "blog-table-figure");
  applyOptionalStyle(figure, "width", block.width);
  applyOptionalStyle(figure, "maxWidth", block.maxWidth);

  const wrapper = document.createElement("div");
  wrapper.className = "blog-table-wrap";
  applyOptionalStyle(wrapper, "width", block.tableWidth);
  applyOptionalStyle(wrapper, "maxWidth", block.tableMaxWidth);
  const table = document.createElement("table");
  table.className = "blog-table";
  applyOptionalStyle(table, "width", block.tableWidth);
  applyOptionalStyle(table, "minWidth", block.tableMinWidth);
  applyOptionalStyle(table, "tableLayout", block.tableLayout);

  if (block.columnWidths?.length) {
    const colgroup = document.createElement("colgroup");
    for (const width of block.columnWidths) {
      const col = document.createElement("col");
      applyOptionalStyle(col, "width", width);
      colgroup.append(col);
    }
    table.append(colgroup);
  }

  if (block.columns?.length) {
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    if (block.headerHeight) {
      applyOptionalStyle(headerRow, "height", block.headerHeight);
    }
    block.columns.forEach((column, columnIndex) => {
      const th = document.createElement("th");
      const columnData = normalizeCell(column);
      appendRichText(th, columnData.text || "", referenceMap);
      applyOptionalStyle(th, "width", columnData.width || block.columnWidths?.[columnIndex]);
      applyOptionalStyle(th, "height", columnData.height);
      applyOptionalStyle(th, "textAlign", columnData.align);
      if (columnData.className) {
        th.classList.add(columnData.className);
      }
      if (columnData.colspan) {
        th.colSpan = columnData.colspan;
      }
      if (columnData.rowspan) {
        th.rowSpan = columnData.rowspan;
      }
      headerRow.append(th);
    });
    thead.append(headerRow);
    table.append(thead);
  }

  const tbody = document.createElement("tbody");
  for (const [rowIndex, rowData] of (block.rows || []).entries()) {
    const row = document.createElement("tr");
    applyOptionalStyle(row, "height", block.rowHeights?.[rowIndex]);
    for (const [columnIndex, cellData] of rowData.entries()) {
      const cellMeta = normalizeCell(cellData);
      const cell = document.createElement("td");
      appendRichText(cell, cellMeta.text || "", referenceMap);
      applyOptionalStyle(cell, "width", cellMeta.width || block.columnWidths?.[columnIndex]);
      applyOptionalStyle(cell, "height", cellMeta.height);
      applyOptionalStyle(cell, "minWidth", cellMeta.minWidth);
      applyOptionalStyle(cell, "maxWidth", cellMeta.maxWidth);
      applyOptionalStyle(cell, "textAlign", cellMeta.align);
      applyOptionalStyle(cell, "verticalAlign", cellMeta.verticalAlign);
      if (cellMeta.className) {
        cell.classList.add(cellMeta.className);
      }
      if (cellMeta.colspan) {
        cell.colSpan = cellMeta.colspan;
      }
      if (cellMeta.rowspan) {
        cell.rowSpan = cellMeta.rowspan;
      }
      row.append(cell);
    }
    tbody.append(row);
  }
  table.append(tbody);
  wrapper.append(table);
  figure.append(wrapper);

  const tableRef = block.tag ? referenceMap[`tbl:${block.tag}`] : null;
  if (block.caption && tableRef) {
    const caption = document.createElement("figcaption");
    caption.className = "blog-table__caption";
    const prefix = document.createElement("span");
    prefix.className = "blog-caption__label";
    prefix.textContent = `${tableRef.label} ${tableRef.number}. `;
    caption.append(prefix);
    appendRichText(caption, block.caption, referenceMap);
    figure.append(caption);
  }

  return figure;
};

const normalizeSectionBlocks = (section) => {
  if (section.content?.length) {
    return section.content;
  }

  const blocks = [];
  for (const paragraph of section.paragraphs || []) {
    blocks.push({ type: "paragraph", text: paragraph });
  }
  if (section.points?.length) {
    blocks.push({ type: "list", items: section.points });
  }
  return blocks;
};

const renderBlock = (block, referenceMap) => {
  switch (block.type) {
    case "paragraph":
      return renderParagraphBlock(block, referenceMap);
    case "list":
      return renderListBlock(block, referenceMap);
    case "figure":
      return renderFigureBlock(block, referenceMap);
    case "figure-group":
      return renderFigureGroupBlock(block, referenceMap);
    case "table":
      return renderTableBlock(block, referenceMap);
    default:
      return null;
  }
};

const renderArticleSection = (section, referenceMap) => {
  const fragment = document.createDocumentFragment();
  fragment.append(createTextElement("h2", "", section.heading));

  for (const block of normalizeSectionBlocks(section)) {
    const renderedBlock = renderBlock(block, referenceMap);
    if (renderedBlock) {
      fragment.append(renderedBlock);
    }
  }

  return fragment;
};

const renderArticle = (post) => {
  const referenceMap = collectReferenceMap(post);
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
    body.append(renderArticleSection(section, referenceMap));
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
