import * as THREE from './vendor/three.module.js';

export function seededRandom(seed = 187) {
  let n = seed >>> 0;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}

function canvasTexture(draw, size = 64) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'); draw(context, size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4; return texture;
}

export function makeMaterials() {
  const rng = seededRandom(731);
  const noise = (ctx, size, base, amount, grain = 2) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size * size / 2; i++) {
      ctx.fillStyle = `rgba(${rng() > .5 ? '255,255,255' : '0,0,0'},${rng() * amount})`;
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), grain, grain);
    }
  };
  const maps = [
    canvasTexture((c,s) => { noise(c,s,'#999da5',.22,3); for(let i=0;i<25;i++){ c.fillStyle='#565d6540';c.fillRect(rng()*s,rng()*s,3+rng()*6,2+rng()*5); } }),
    canvasTexture((c,s) => { noise(c,s,'#d5dcda',.045,1);c.strokeStyle='#8c989e';c.lineWidth=2;c.strokeRect(1,1,s-2,s-2);c.fillStyle='#afbabd';c.fillRect(5,52,54,3);c.fillRect(6,6,8,2);c.fillRect(49,6,8,2);c.fillStyle='#eff2e6';c.fillRect(3,3,58,1);for(const x of [5,57])for(const y of [6,46]){c.fillStyle='#829097';c.fillRect(x,y,2,2);} }),
    canvasTexture((c,s) => { noise(c,s,'#343d46',.16,3);c.strokeStyle='#1c242d';c.lineWidth=2;c.strokeRect(1,1,s-2,s-2);c.fillStyle='#626d7730';c.fillRect(4,4,56,2); }),
    canvasTexture((c,s) => { c.fillStyle='#5aafb9';c.fillRect(0,0,s,s);c.strokeStyle='#b0e8e5';c.lineWidth=3;c.strokeRect(1.5,1.5,s-3,s-3);c.strokeStyle='#d2fbf53b';c.lineWidth=3;c.beginPath();c.moveTo(12,51);c.lineTo(45,12);c.moveTo(23,52);c.lineTo(51,19);c.stroke(); }),
    canvasTexture((c,s) => {c.fillStyle='#29364b';c.fillRect(0,0,s,s);c.fillStyle='#122945';c.fillRect(3,3,58,58);for(let x=5;x<60;x+=14)for(let y=5;y<60;y+=14){c.fillStyle=`hsl(${215+rng()*9} 44% ${28+rng()*7}%)`;c.fillRect(x,y,12,12);c.fillStyle='#9cc8e322';c.fillRect(x+1,y+1,10,2);}c.strokeStyle='#8296a5';c.lineWidth=2;c.strokeRect(1,1,62,62);}),
    canvasTexture((c,s) => {noise(c,s,'#b9834d',.12,2);c.strokeStyle='#7b512f';c.lineWidth=2;c.strokeRect(1,1,62,62);c.fillStyle='#dec495';c.fillRect(3,3,58,2);c.fillStyle='#513e32';for(let i=0;i<4;i++)c.fillRect(8,13+i*11,48,2);}),
    canvasTexture((c,s) => { c.fillStyle='#e0f7aa';c.fillRect(0,0,s,s);c.strokeStyle='#8f9d71';c.lineWidth=5;c.strokeRect(2.5,2.5,s-5,s-5);c.fillStyle='#f2ffe1';c.fillRect(9,9,46,3);c.fillStyle='#ffffff18';for(let i=16;i<52;i+=10)c.fillRect(10,i,44,2); }),
    canvasTexture((c,s) => {noise(c,s,'#d6714a',.07,2);c.strokeStyle='#9c4b33';c.lineWidth=2;c.strokeRect(1,1,62,62);c.fillStyle='#e9d8af';c.fillRect(3,42,58,9);c.fillStyle='#482f2e';for(let x=-5;x<60;x+=16){c.beginPath();c.moveTo(x,51);c.lineTo(x+7,42);c.lineTo(x+13,42);c.lineTo(x+6,51);c.fill();}}),
  ];
  return maps.map((map,i) => new THREE.MeshStandardMaterial({map,roughness:i===3?.14:i===5?.48:.85,metalness:i===1?.25:i===4?.32:i===5?.5:.04,transparent:i===3,opacity:i===3?.55:1,depthWrite:i!==3,emissive:i===6?0xc7e98e:i===3?0x2a6475:0x000000,emissiveIntensity:i===6?.9:i===3?.1:0}));
}

export function makeGroundTexture() {
  const rng=seededRandom(89);
  const texture=canvasTexture((c,s)=>{
    c.fillStyle='#8b909a';c.fillRect(0,0,s,s);
    for(let i=0;i<45000;i++){const v=Math.round(105+rng()*70);c.fillStyle=`rgba(${v},${v+2},${v+6},${.1+rng()*.45})`;c.fillRect(rng()*s,rng()*s,1+rng()*3,1+rng()*3);}
    for(let i=0;i<65;i++){const x=rng()*s,y=rng()*s,r=2+rng()*12;c.fillStyle='#353d4820';c.beginPath();c.ellipse(x,y,r,r*.6,0,0,Math.PI*2);c.fill();c.strokeStyle='#dee3ec20';c.lineWidth=1;c.beginPath();c.ellipse(x,y+1,r,r*.6,0,0,Math.PI);c.stroke();}
  },512);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(50,50);return texture;
}

export function addSpace(scene) {
  const rng=seededRandom(411);
  const vertices=[],colors=[];
  for(let i=0;i<2400;i++){
    const theta=rng()*Math.PI*2, y=.06+rng()*.94,r=Math.sqrt(1-y*y),distance=370+rng()*80;
    vertices.push(Math.cos(theta)*r*distance,y*distance,Math.sin(theta)*r*distance);
    const b=.3+rng()*.7;colors.push(b*.85,b*.91,b);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const stars=new THREE.Points(geometry,new THREE.PointsMaterial({size:.8,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.86,fog:false}));scene.add(stars);
  const earthTexture=canvasTexture((c,s)=>{
    const data=c.createImageData(s,s);
    for(let y=0;y<s;y++)for(let x=0;x<s;x++){
      const lon=x/s*Math.PI*2,lat=(y/s-.5)*Math.PI;
      const land=Math.sin(lon*3.1+Math.sin(lat*4)*2)+Math.cos(lat*5.4+Math.sin(lon*2.5))+Math.sin(lon*7+lat*9)*.36+Math.cos(lon*13-lat*8)*.17;
      const clouds=Math.sin(lon*9+lat*12+Math.sin(lon*5-lat*6)*2)+Math.cos(lon*12-lat*17)*.45;
      let rgb=land>.64?[56,103,102]:[22,70,118];
      if(land>1.15)rgb=[87,117,100];
      if(clouds>1.02||Math.abs(lat)>1.36)rgb=[174,199,206];
      const i=(y*s+x)*4;data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=255;
    }
    c.putImageData(data,0,0);
  },512);
  earthTexture.magFilter=THREE.LinearFilter;
  const planet=new THREE.Mesh(new THREE.SphereGeometry(16,64,48),new THREE.MeshStandardMaterial({map:earthTexture,roughness:1,emissive:0x173b65,emissiveIntensity:.18,fog:false}));
  planet.position.set(-86,23,-145);planet.rotation.set(.17,.4,-.2);scene.add(planet);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(16.4,48,32),new THREE.ShaderMaterial({uniforms:{glowColor:{value:new THREE.Color('#6ec5ff')}},vertexShader:'varying vec3 vN; varying vec3 vP; void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vP=p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 glowColor; varying vec3 vN; varying vec3 vP; void main(){float edge=1.0-abs(dot(normalize(vN),normalize(-vP)));float glow=pow(edge,4.0);gl_FragColor=vec4(glowColor,glow*0.55);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  atmosphere.position.copy(planet.position);scene.add(atmosphere);
  return {planet,stars};
}
