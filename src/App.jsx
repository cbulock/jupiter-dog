import imageList from "./imageList.json";
import './App.css';

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
    <header><img src={'https://jupiter.dog/.netlify/images?url=/android-chrome-192x192.png&w=64&h=64'} width={64} height={64} /><h1>Life of Jupiter</h1></header>
      
      {imageList.map((image) => {
        const {width, height, fileName} = image;
        const newSizes = newImageSize({width, height})
        return (<img key={fileName} loading="lazy" src={imagePath({image, width: newSizes.width, height:newSizes.height})} width={newSizes.width} height={newSizes.height} />)
})}
    </>
  );
}

export default App;
