import imageList from "./imageList.json";

function App() {
  return (
    <>
      <h1>Life of Jupiter</h1>
      {imageList.map((image) => (
        <img key={image.fileName} src={`https://jupiter.dog/.netlify/images?url=/images/${image.fileName}&w=300`} />
      ))}
    </>
  );
}

export default App;
