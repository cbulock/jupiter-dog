import imageList from "@/imageList.json";

export const GET = async (request, response) => {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') || 1;
  const pageSize = searchParams.get('pageSize') || 10;

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = imageList.slice(startIndex, endIndex);

  const totalPages = Math.ceil(imageList.length / pageSize);
  const currentPage = page;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return Response.json({
    currentPage,
    currentPageSize: pageSize,
    data,
    hasNextPage,
    hasPrevPage,
    totalPages,
  });
};
