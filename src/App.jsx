import imageList from "./imageList.json";

function App() {
  return (
    <>
      <h1>Life of Jupiter</h1>
      {imageList.map((image) => (
        <img key={image.fileName} src={`/images/${image.fileName}`} width={300} />
      ))}
    </>
  );
}

export default App;
