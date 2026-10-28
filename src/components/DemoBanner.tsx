import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, RotateCcw, X } from 'lucide-react';
import { resetDemo } from '../lib/demo/backend';
import './demo-banner.css';

export function DemoBanner() {
  const [confirming, setConfirming] = useState(false);
  return <>
    <div className="demo-banner" role="status">
      <FlaskConical size={16} />
      <strong>MODO DEMO</strong>
      <span className="demo-banner-text">Dados fictícios para apresentação. Nada aqui afeta a operação real nem envia e-mails.</span>
      <button type="button" onClick={() => setConfirming(true)}><RotateCcw size={14} /> Reiniciar demo</button>
    </div>
    {confirming && createPortal(<div className="demo-confirm-layer" onClick={() => setConfirming(false)}>
      <div className="demo-confirm" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="demo-confirm-close" onClick={() => setConfirming(false)} aria-label="Fechar"><X size={18} /></button>
        <strong>Reiniciar a demonstração?</strong>
        <p>Tudo o que foi cadastrado ou alterado nesta demo volta ao original: agenda, follow-ups, campanhas, Visita 150h e insights. As datas são recalculadas a partir de hoje.</p>
        <div>
          <button type="button" className="subtle-button" onClick={() => setConfirming(false)}>Cancelar</button>
          <button type="button" className="primary-button" onClick={() => { resetDemo(); window.location.reload(); }}><RotateCcw size={15} /> Reiniciar</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
