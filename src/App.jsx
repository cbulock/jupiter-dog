import imageList from "./imageList.json";

const isDev = false;

const imagePath = ({image, width, height}) => ( isDev ? `/images/${image.fileName}` : `https://jupiter.dog/.netlify/images?url=/images/${image.fileName}&w=${width}&h=${height}`);

const newImageSize = ({width: originalWidth, height: originalHeight}) => {
  const maxSize = 400;
  let newWidth, newHeight;

  if (originalWidth > originalHeight) {
      // Width is the larger dimension
      newWidth = maxSize;
      newHeight = (originalHeight / originalWidth) * maxSize;
  } else {
      // Height is the larger dimension or they are equal
      newHeight = maxSize;
      newWidth = (originalWidth / originalHeight) * maxSize;
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) };
}

function App() {
  return (
    <>
      <h1>Life of Jupiter</h1>
      {imageList.map((image) => {
        const {width, height, fileName} = image;
        const newSizes = newImageSize({width, height})
        return (<img key={fileName} loading="lazy" src={imagePath({image, width: newSizes.width, height:newSizes.height})} width={newSizes.width} height={newSizes.height} />)
})}
    </>
  );
}

export default App;
