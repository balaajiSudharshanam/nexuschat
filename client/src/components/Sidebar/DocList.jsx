import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { fetchDocs, deleteDoc, uploadPdf } from '../../api/http';

export default function DocList() {
  const { docs, setDocs } = useChatStore();
  const fileRef = useRef();

  useEffect(() => {
    fetchDocs().then(setDocs);
  }, [setDocs]);

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    await uploadPdf(file);
    fetchDocs().then(setDocs);
  };

  const handleDelete = async (doc) => {
    await deleteDoc(doc);
    setDocs((prev) => prev.filter((d) => d !== doc));
  };

  return (
    <section>
      <h3 style={heading}>Documents</h3>
      <ul style={{ listStyle: 'none', marginBottom: 8 }}>
        {docs.map((doc) => (
          <li key={doc} style={item}>
            <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc}</span>
            <button onClick={() => handleDelete(doc)} style={delBtn}>✕</button>
          </li>
        ))}
      </ul>
      <button onClick={() => fileRef.current.click()} style={uploadBtn}>+ Upload PDF</button>
      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files[0])} />
    </section>
  );
}

const heading = { fontSize: 11, textTransform: 'uppercase', color: '#666', letterSpacing: 1, marginBottom: 8 };
const item = { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0', color: '#ccc' };
const delBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, padding: 2 };
const uploadBtn = { width: '100%', padding: '6px 0', borderRadius: 6, border: '1px dashed #444', background: 'none', color: '#888', cursor: 'pointer', fontSize: 12 };
