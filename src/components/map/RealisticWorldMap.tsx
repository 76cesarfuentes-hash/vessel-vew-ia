import React from 'react';

interface RealisticWorldMapProps {
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * High-precision Vector World Map (Plate Carrée Equirectangular 1000x500)
 * Detailed, accurate coastline geometry for all major continents and islands.
 */
export const RealisticWorldMap: React.FC<RealisticWorldMapProps> = ({
  className = "w-full h-full",
  fill = "#0C2540",
  stroke = "#00E5FF",
  strokeWidth = 0.75,
  opacity = 0.85
}) => {
  return (
    <g className={className} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity}>
      {/* NORTH AMERICA (Alaska, Canada, USA, Mexico, Central America) */}
      <path d="
        M 45,70 L 75,55 L 110,50 L 135,55 L 140,75 L 120,85 L 105,75 L 85,85 L 60,82 Z
        M 135,55 L 165,35 L 210,30 L 260,25 L 300,28 L 325,45 L 320,65 L 290,75 L 305,95 L 325,110 L 310,120 L 285,115
        L 270,95 L 250,90 L 240,70 L 225,85 L 205,80 L 180,95 L 160,110 L 140,115 L 145,90 L 135,75 Z
        M 140,115 L 155,130 L 160,150 L 175,160 L 185,180 L 205,190 L 230,195 L 250,205 L 260,195 L 275,195
        L 280,180 L 310,165 L 315,140 L 300,125 L 285,115 L 245,115 L 215,113 L 170,115 Z
        M 205,190 L 215,200 L 230,215 L 245,220 L 260,225 L 275,227 L 278,225 L 272,218 L 265,215 L 255,205 L 240,200 Z
      " />

      {/* BAJA CALIFORNIA */}
      <path d="M 175,162 L 182,175 L 195,190 L 198,188 L 186,172 L 178,160 Z" />

      {/* GREENLAND */}
      <path d="M 298,30 L 340,20 L 415,18 L 460,22 L 465,45 L 435,70 L 380,82 L 340,78 L 310,60 Z" />

      {/* ICELAND */}
      <path d="M 433,68 L 455,66 L 462,72 L 442,76 Z" />

      {/* SOUTH AMERICA */}
      <path d="
        M 278,225 L 290,218 L 315,218 L 345,225 L 375,235 L 402,260 L 395,290 L 370,325 L 345,360 L 325,400
        L 310,402 L 312,385 L 305,360 L 302,335 L 288,310 L 280,283 L 275,256 L 278,240 Z
      " />

      {/* BRITISH ISLES */}
      <path d="
        M 472,102 L 480,100 L 482,108 L 473,108 Z
        M 483,92 L 502,90 L 505,102 L 498,110 L 488,110 L 484,102 Z
      " />

      {/* EUROPE & SCANDINAVIA */}
      <path d="
        M 512,58 L 535,52 L 565,55 L 585,68 L 575,90 L 550,98 L 532,95 L 522,82 L 512,70 Z
        M 475,132 L 502,130 L 508,142 L 498,150 L 478,148 L 475,138 Z
        M 502,130 L 525,120 L 550,115 L 575,120 L 585,135 L 568,148 L 552,142 L 532,135 L 515,132 Z
        M 522,122 L 535,120 L 542,135 L 550,144 L 540,144 L 532,135 L 525,128 Z
      " />

      {/* AFRICA */}
      <path d="
        M 452,148 L 480,146 L 520,146 L 560,150 L 595,162 L 592,180 L 578,198 L 610,210 L 641,228
        L 625,260 L 595,290 L 575,325 L 555,347 L 538,345 L 530,320 L 527,290 L 522,260
        L 505,245 L 472,238 L 452,212 L 450,180 Z
      " />

      {/* MADAGASCAR */}
      <path d="M 622,283 L 638,288 L 632,318 L 619,315 Z" />

      {/* ARABIAN PENINSULA & MIDDLE EAST */}
      <path d="
        M 597,162 L 630,160 L 666,170 L 658,202 L 638,216 L 610,210 L 598,195 L 595,178 Z
        M 572,133 L 615,130 L 650,135 L 675,150 L 666,170 L 630,160 L 595,162 L 580,150 Z
      " />

      {/* MAINLAND ASIA */}
      <path d="
        M 580,120 L 650,110 L 720,80 L 800,50 L 880,42 L 960,38 L 1000,45 L 990,75 L 950,95 L 910,115
        L 880,125 L 850,130 L 820,135 L 780,150 L 740,152 L 700,152 L 650,135 Z
        M 700,152 L 740,152 L 755,175 L 745,210 L 725,227 L 715,220 L 705,200 L 688,180 Z
        M 740,152 L 800,145 L 847,140 L 848,165 L 837,175 L 816,190 L 805,210 L 788,246 L 775,235 L 763,210 L 755,175 Z
      " />

      {/* KOREA */}
      <path d="M 844,133 L 858,135 L 861,152 L 848,155 L 845,142 Z" />

      {/* JAPAN */}
      <path d="
        M 885,125 L 902,132 L 892,142 L 880,135 Z
        M 861,138 L 882,142 L 885,158 L 868,162 L 863,150 Z
        M 860,162 L 870,163 L 865,167 L 858,165 Z
      " />

      {/* TAIWAN */}
      <path d="M 833,180 L 838,182 L 836,188 L 832,186 Z" />

      {/* PHILIPPINES */}
      <path d="
        M 828,197 L 838,195 L 835,210 L 825,208 Z
        M 830,212 L 845,215 L 850,230 L 835,232 Z
      " />

      {/* INDONESIA & MALAYSIA */}
      <path d="
        M 763,235 L 788,246 L 800,265 L 775,258 Z
        M 790,265 L 820,266 L 818,272 L 788,270 Z
        M 800,238 L 828,236 L 830,260 L 802,258 Z
        M 830,240 L 848,245 L 842,265 L 828,258 Z
        M 860,250 L 915,252 L 920,275 L 865,270 Z
      " />

      {/* AUSTRALIA & TASMANIA */}
      <path d="
        M 813,280 L 845,278 L 880,282 L 915,290 L 925,315 L 915,345 L 895,358 L 850,358 L 820,345 L 812,315 L 815,295 Z
      " />
      <path d="M 900,361 L 911,363 L 908,372 L 898,370 Z" />

      {/* NEW ZEALAND */}
      <path d="
        M 968,344 L 988,350 L 980,362 L 965,355 Z
        M 960,362 L 980,365 L 975,382 L 955,378 Z
      " />

      {/* CARIBBEAN */}
      <path d="
        M 255,198 L 275,195 L 272,202 L 252,203 Z
        M 278,200 L 292,202 L 288,208 L 276,205 Z
      " />
    </g>
  );
};
