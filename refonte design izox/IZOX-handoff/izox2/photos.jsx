// Vehicle photo placeholders — realistic Unsplash URLs, three poses per car family.
// These are CDN-hosted; the standalone bundler will leave them as external URLs.

const PHOTOS = {
  vito:      "https://images.unsplash.com/photo-1612825173281-9a193378527e?auto=format&fit=crop&w=900&q=70",
  vitoSide:  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=70",
  tesla:     "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=900&q=70",
  teslaInt:  "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=900&q=70",
  classS:    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=70",
  audi:      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=70",
  bmw:       "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=70",
  trafic:    "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?auto=format&fit=crop&w=900&q=70",
  range:     "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=70",
  detail:    "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=70",
  detail2:   "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=70",
  hangar:    "https://images.unsplash.com/photo-1601928470770-e8a2b8a45dd8?auto=format&fit=crop&w=1400&q=70",
  // Interior + detail close-ups for hero / fiche
  rim:       "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=70",
  cabin:     "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=70",
  drop:      "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=70",
  // Eco / RSE imagery
  forest:    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=70",
  water:     "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1000&q=70",
  leaves:    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=70",
  ecoWash:   "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1000&q=70",
};

const PhotoFrame = ({ src, ratio = "16 / 10", alt, children, style = {}, frame = true }) => (
  <div style={{
    position:"relative", width:"100%", aspectRatio: ratio,
    background: TOK.panel, borderRadius: TOK.r4, overflow:"hidden",
    border: frame ? `1px solid ${TOK.line}` : "none",
    ...style,
  }}>
    <img src={src} alt={alt || ""} style={{
      position:"absolute", inset: 0, width: "100%", height: "100%",
      objectFit: "cover", display:"block",
    }}/>
    <div style={{
      position:"absolute", inset: 0, pointerEvents:"none",
      background: "linear-gradient(180deg, transparent 40%, rgba(12,14,18,.25) 100%)",
    }}/>
    {children}
  </div>
);

// Lightweight SVG illustration used in hero strips
const StripeMarks = ({ color = TOK.brand }) => (
  <svg width="100%" height="14" preserveAspectRatio="none" viewBox="0 0 400 14">
    {[...Array(40)].map((_, i) => (
      <rect key={i} x={i * 10} y="0" width="1" height={ (i % 5 === 0) ? 14 : 6 } fill={color}/>
    ))}
  </svg>
);

Object.assign(window, { PHOTOS, PhotoFrame, StripeMarks });
