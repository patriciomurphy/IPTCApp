const { Camera, Save, Share2, MoreVertical, X, Plus, Image: ImageIcon, CheckCircle, ChevronLeft, UploadCloud, Edit3, MapPin, User, Briefcase, Type, Sparkles, Loader2 } = lucide;

const { useState, useEffect, useRef } = React;

const apiKey = "vck_13Jz0j8GHlp0JSO5nkCs1Tj2FfTiPeePFBN1h7UisiCegw1m7t2rOGtK";

// ✅ SOLUCIÓN AL PROBLEMA DE ESCRITURA:
// El componente de Input debe estar FUERA para que no pierda el foco al re-renderizar.
const MetaInput = ({ label, value, field, onChange, isArea = false, placeholder = "", withAI = false, onAI }) => ( React.createElement('div', { className: "bg-slate-800 p-3 rounded-lg border border-slate-700 mb-3" }, React.createElement('div', { className: "flex justify-between items-center mb-1" }, React.createElement('label', { className: "text-[10px] uppercase font-bold text-slate-500" }, label), withAI && React.createElement('button', { onClick: () => onAI(field), className: "text-blue-400 p-1" }, React.createElement(Sparkles, { className: "w-3.5 h-3.5" })) ), isArea ? React.createElement('textarea', { value: value, onChange: (e) => onChange(field, e.target.value), className: "w-full bg-transparent text-white outline-none h-24 resize-none text-sm", placeholder: placeholder }) : React.createElement('input', { value: value, onChange: (e) => onChange(field, e.target.value), className: "w-full bg-transparent text-white outline-none text-sm", placeholder: placeholder }) ) );

const MobileApp = () => {
  const [images, setImages] = useState([]);
  const [view, setView] = useState('list');
  const [activeImageId, setActiveImageId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [globalMetadata, setGlobalMetadata] = useState({
    title: '', headline: '', description: '', keywords: '', category: '',
    creator: '', authorsPosition: '', credit: '', source: '',
    captionWriter: '', copyright: '', city: '', state: '',
    country: '', countryCode: '', transmissionRef: ''
  });
  
  const [activeSection, setActiveSection] = useState('content');
  const fileInputRef = useRef(null);
  const xmpInputRef = useRef(null);

  // Manejador de cambio unificado para los inputs
  const handleInputChange = (field, newValue) => {
    setGlobalMetadata(prev => ({ ...prev, [field]: newValue }));
  };

  useEffect(() => {
    if (!window.piexif) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/piexifjs@1.0.6/piexif.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // --- Lógica de Gemini (fetchWithRetry, analyzeImage, refineText...) ---
  // [Se mantiene igual a tu código original...]
  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok && retries > 0) throw new Error('Retry');
      return response;
    } catch (err) {
      if (retries <= 0) throw err;
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
  };

  const analyzeImageWithGemini = async (imgId) => {
    const img = images.find(i => i.id === imgId);
    if (!img) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(img.file);
      });
      const base64Data = await base64Promise;
      const prompt = `Actúa como un editor de agencia de noticias. Analiza esta imagen y genera metadatos IPTC en formato JSON: headline, description, keywords (10). Estilo ZUMA Press.`;
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      const result = await response.json();
      const aiData = JSON.parse(result.candidates[0].content.parts[0].text);
      setGlobalMetadata(prev => ({ ...prev, ...aiData }));
    } catch (error) { console.error(error); } finally { setIsAnalyzing(false); }
  };

  const refineTextWithGemini = async (field) => {
    if (!globalMetadata[field]) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Mejora este texto periodístico: "${globalMetadata[field]}". Solo devuelve el texto mejorado.`;
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const result = await response.json();
      const improved = result.candidates[0].content.parts[0].text;
      handleInputChange(field, improved.trim());
    } catch (error) { console.error(error); } finally { setIsAnalyzing(false); }
  };

  // --- Procesamiento de imagen y Handlers ---
  const createXmpPacket = (data) => {
    return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="WebIptcTagger 1.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
   photoshop:City="${data.city}" photoshop:State="${data.state}" photoshop:Country="${data.country}"
   photoshop:Category="${data.category}" photoshop:AuthorsPosition="${data.authorsPosition}"
   photoshop:Credit="${data.credit}" photoshop:Source="${data.source}"
   photoshop:CaptionWriter="${data.captionWriter}" photoshop:Headline="${data.headline}"
   photoshop:TransmissionReference="${data.transmissionRef}" xmpRights:Marked="True"
   Iptc4xmpCore:CountryCode="${data.countryCode}">
   <dc:subject><rdf:Bag>${data.keywords.split(',').map(k => `<rdf:li>${k.trim()}</rdf:li>`).join('')}</rdf:Bag></dc:subject>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${data.description}</rdf:li></rdf:Alt></dc:description>
   <dc:creator><rdf:Seq><rdf:li>${data.creator}</rdf:li></rdf:Seq></dc:creator>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta><?xpacket end="w"?>`;
  };

  const insertXmpIntoJpeg = (jpegDataUrl, xmpString) => {
    const raw = atob(jpegDataUrl.split(',')[1]);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);
    const header = "http://ns.adobe.com/xap/1.0/\0";
    const segmentLen = 2 + header.length + xmpString.length;
    const buffer = new Uint8Array(2 + segmentLen);
    buffer[0] = 0xFF; buffer[1] = 0xE1;
    buffer[2] = (segmentLen >> 8) & 0xFF; buffer[3] = segmentLen & 0xFF;
    for(let i=0; i<header.length; i++) buffer[4+i] = header.charCodeAt(i);
    for(let i=0; i<xmpString.length; i++) buffer[4+header.length+i] = xmpString.charCodeAt(i);
    const newJpeg = new Uint8Array(uint8Array.length + buffer.length);
    newJpeg.set(uint8Array.slice(0, 2), 0);
    newJpeg.set(buffer, 2);
    newJpeg.set(uint8Array.slice(2), 2 + buffer.length);
    let binary = '';
    for (let i = 0; i < newJpeg.length; i++) binary += String.fromCharCode(newJpeg[i]);
    return 'data:image/jpeg;base64,' + btoa(binary);
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file, preview: URL.createObjectURL(file),
      name: file.name, size: (file.size / 1024 / 1024).toFixed(2), status: 'pending'
    }));
    setImages(prev => [...prev, ...newImages]);
    if (images.length === 0 && newImages.length > 0) {
      setActiveImageId(newImages[0].id);
      setView('editor');
    }
  };

  const processImage = async (imgId) => {
    const img = images.find(i => i.id === imgId);
    const reader = new FileReader();
    reader.onload = (e) => {
      const xmpStr = createXmpPacket({...globalMetadata, transmissionRef: globalMetadata.transmissionRef.replace('{filename}', img.name)});
      const finalJpeg = insertXmpIntoJpeg(e.target.result, xmpStr);
      setImages(prev => prev.map(i => i.id === imgId ? { ...i, status: 'processed', processedDataUrl: finalJpeg } : i));
    };
    reader.readAsDataURL(img.file);
  };

  // --- UI Components ---
  const Header = () => (
    <div className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-30 flex justify-between items-center h-16">
      {view === 'editor' ? (
        <button onClick={() => setView('list')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
      ) : (
        <div className="flex items-center gap-2"><Camera className="w-6 h-6 text-blue-400" /><span className="font-bold">IPTC Droid</span></div>
      )}
      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2"><MoreVertical className="w-6 h-6" /></button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-200 select-none">
      <Header />
      <input type="file" multiple accept="image/jpeg" className="hidden" ref={fileInputRef} onChange={handleAddImages} />
      
      {view === 'list' ? (
        <div className="p-4 grid grid-cols-1 gap-4">
          {images.map(img => (
            <div key={img.id} onClick={() => { setActiveImageId(img.id); setView('editor'); }} className="bg-slate-900 p-3 rounded-2xl flex gap-4 border border-slate-800">
              <img src={img.preview} className="w-20 h-20 object-cover rounded-xl" />
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold truncate text-sm">{img.name}</h3>
                <p className="text-xs text-slate-500">{img.size} MB</p>
              </div>
            </div>
          ))}
          <button onClick={() => fileInputRef.current.click()} className="fixed bottom-8 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl"><Plus className="w-10 h-10" /></button>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-y-auto pb-32">
          <div className="bg-black aspect-video flex items-center justify-center relative">
            <img src={images.find(i => i.id === activeImageId)?.preview} className="h-full object-contain" />
            <button onClick={() => analyzeImageWithGemini(activeImageId)} className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AUTO-TAG
            </button>
          </div>
          
          <div className="p-4">
            <MetaInput label="Headline" field="headline" value={globalMetadata.headline} onChange={handleInputChange} withAI onAI={refineTextWithGemini} />
            <MetaInput label="Descripción" field="description" value={globalMetadata.description} onChange={handleInputChange} isArea withAI onAI={refineTextWithGemini} />
            <MetaInput label="Ciudad" field="city" value={globalMetadata.city} onChange={handleInputChange} />
            <MetaInput label="Crédito" field="credit" value={globalMetadata.credit} onChange={handleInputChange} />
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800">
            <button onClick={() => processImage(activeImageId)} className="w-full bg-blue-600 py-4 rounded-2xl font-bold">GUARDAR METADATOS</button>
          </div>
        </div>
      )}
    </div>
  );
};


const root = ReactDOM.createRoot(document.getElementById('root')); root.render(React.createElement(MobileApp));




