(async (categoryId) => {

if (!categoryId) {
  throw new Error('CategoryId is not provided to IIF');
}

const postData = async (url = "", data = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

const downloadData = (data, name) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const aElem = document.createElement('a');
  aElem.setAttribute("href", dataStr);
  aElem.setAttribute("download", `${name}.json`);
  aElem.click();
}

const getFilterResults = (categoryId, page) => {
  return postData("https://www.alza.cz/Services/EShopService.svc/Filter", {
    append: true,
    artistId: null,
    availabilityType: 0,
    branchId: -2,
    callFromParametrizationDialog: false,
    categoryType: 1,
    commodityStatusType: null,
    configurationId: 3,
    counter: 3,
    hash: "#f&cst=null&cud=0&pg=1-4&prod=",
    idCategory: categoryId,
    idPrefix: 0,
    maxPrice: -1,
    minPrice: -1,
    newsOnly: false,
    page: page,
    pageTo: page,
    parameters: [],
    prefixType: 0,
    producers: "",
    scroll: 0,
    searchTerm: "",
    showOnlyActionCommodities: false,
    sort: 0,
    upperDescriptionStatus: 0,
    yearFrom: null,
    yearTo: null,
  });
}

const getCategoryName = (categoryId) => {
  return `raw_${categoryId}`;
}

const parseItemsDataFromFilterResults = (filterResults) => {
  const results = filterResults.d;
  const boxes = results.Boxes;

  const idRegex = /data-gtm-add-cart-id="(\d+)"/g;
  const priceRegex = /data-gtm-commodity-price-vat="(\d+\.\d+)"/g;
  const brandRegex = /data-gtm-commodity-brand="([ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮĚÓa-zA-Z0-9_\s\/\,\.\(\)\-\+\;\°\`\§\'\"\&amp;]+)"/g;
  const nameRegex = /data-gtm-commodity-name="([ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮĚÓa-zA-Z0-9\s\/\,\.\(\)\-\+\\°\`\§\'\"\&amp;]+)"/g
  const idMatches = [...boxes.matchAll(idRegex)];
  const priceMatches = [...boxes.matchAll(priceRegex)];
  const brandMatches = [...boxes.matchAll(brandRegex)];
  const nameMatches = [...boxes.matchAll(nameRegex)];

  // failed to parse for some attribute
  if (idMatches.length != priceMatches.length ||
    idMatches.length != brandMatches.length ||
    idMatches.length != nameMatches.length) {

    console.log(boxes);
    throw new Error('Failed to parse data from filter results');
  }

  const itemData = [];
  for (let i = 0; i < idMatches.length; i++) {
    itemData.push({
      id: idMatches[i][1],
      price: priceMatches[i][1],
      brand: brandMatches[i][1],
      name: nameMatches[i][1],
    })
    
  }

  return itemData;
}

const getDataForCategory = async (categoryId, batchSize = 10) => {
  // Get first page of a search results
  const response = await getFilterResults(categoryId, 1);
  let resultData = parseItemsDataFromFilterResults(response);

  // Find all other items from category
  const itemsCount = response.d.Count;
  const pageSize = resultData.length;
  const pagesCount = Math.ceil(itemsCount / pageSize);

  const pages = Array.from({length: pagesCount}, (_, i) => i + 1).slice(1)
  for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages
        .slice(i, i + batchSize)
        .map(pageNum => getFilterResults(categoryId, pageNum))
      
      const results = (await Promise.all(batch))
        .map(resp => parseItemsDataFromFilterResults(resp))
        .reduce((acc, curr) => {
          return [...acc, ...curr];
        }, []);
      resultData = [...resultData, ...results];
  }

  return resultData;
}

const data = await getDataForCategory(categoryId);
downloadData(data, getCategoryName(categoryId));

})()