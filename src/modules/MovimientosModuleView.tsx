import React from 'react';
import { ManoMasLargaView } from './ManoMasLargaView';

export const MovimientosModuleView: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col bg-[#050D18] overflow-hidden">
      <ManoMasLargaView />
    </div>
  );
};

export default MovimientosModuleView;
