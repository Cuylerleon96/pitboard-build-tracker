function PhotoStrip({ photos }) {
  if (!photos?.length) return null

  return (
    <div className="photo-strip">
      {photos.map((photo) => (
        <a className="photo-thumb" href={photo.dataUrl} key={photo.id} target="_blank" rel="noreferrer">
          <img alt={photo.name} src={photo.dataUrl} />
        </a>
      ))}
    </div>
  )
}

export default PhotoStrip
