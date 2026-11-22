import {POLICE_PAINT} from './pursuit';
import {daylight} from './lighting';
import {CARS} from './cars';
import {SIZE,WORLD_WIDTH,WORLD_HEIGHT,bridges,bridgeHeight,desertHalfWidth,snowHalfWidth,isSnow,isDesert,isRoad,shore,routes,roadWidth,buildings,trees,groundHeight,streetlights,isPalm,airfield,hangar,lighthouse} from './world';

const colors = new Map();
function rgb(hex){
  if(!colors.has(hex)){
    colors.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  }
  return colors.get(hex);
}

class Mesh {
  vertices = [];
  base = 0;
  triangle(a,b,c,color,shade=1){
    const tint=rgb(color).map(channel=>channel*shade);
    for(const [x,y,z] of [a,b,c]){
      this.vertices.push(this.swapAxes?z:x,y+this.base,this.swapAxes?x:z,...tint);
    }
  }
  quad(a,b,c,d,color,shade){
    this.triangle(a,b,c,color,shade);
    this.triangle(a,c,d,color,shade);
  }
  plane(x,z,w,d,y,color){
    this.quad([x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],color);
  }
  box(x,z,w,d,bottom,top,color){
    const l=x-w/2,r=x+w/2,n=z-d/2,s=z+d/2;
    const a=[l,top,n],b=[r,top,n],c=[r,top,s],e=[l,top,s];
    const f=[l,bottom,n],g=[r,bottom,n],h=[r,bottom,s],i=[l,bottom,s];
    this.quad(a,b,c,e,color,1);
    this.quad(a,b,g,f,color,.85);
    this.quad(b,c,h,g,color,.66);
    this.quad(c,e,i,h,color,.79);
    this.quad(e,a,f,i,color,.94);
  }
  strip(ax,az,bx,bz,width,y,color){
    const length=Math.hypot(bx-ax,bz-az);
    const dx=(bz-az)*width/(2*length),dz=(ax-bx)*width/(2*length);
    this.quad([ax+dx,y,az+dz],[bx+dx,y,bz+dz],[bx-dx,y,bz-dz],[ax-dx,y,az-dz],color);
  }
  disc(x,z,r,y,color){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
      this.triangle([x,y,z],[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+r*Math.cos(b),y,z+r*Math.sin(b)],color);
    }
  }
  cone(x,z,r,y,height,color,sides=6){
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
      this.triangle([x,y+height,z],[x+r*Math.cos(a),y,z+r*Math.sin(a)],
        [x+r*Math.cos(b),y,z+r*Math.sin(b)],color,.71+i/sides*.29);
    }
  }
}

function terrain(mesh){
  mesh.plane(-1500,-1500,WORLD_WIDTH+3000,WORLD_HEIGHT+3000,-.5,'#468c99');
  const step=29;
  const landRow=z=>{
    const edge=shore(z)-42;
    return Array.from({length:Math.ceil(edge/step)+2},(_,i)=>{
      const x=Math.min(i*step,edge);
      return [x,groundHeight(x,z),z];
    });
  };
  let row=landRow(-600);
  for(let z=-600;z<SIZE;z+=step){
    const next=landRow(Math.min(z+step,SIZE));
    const first=row.at(-1),last=next.at(-1);
    mesh.quad([-1600,0,z],row[0],next[0],[-1600,0,z+step],'#74835a');
    for(let i=0;i<Math.max(row.length,next.length)-2;i++){
      const a=row[i]??first,b=row[i+1]??first,c=next[i+1]??last,d=next[i]??last;
      const slope=(a[1]-c[1])*.012+(d[1]-b[1])*.009;
      mesh.quad(a,b,c,d,'#818c63',Math.max(.81,Math.min(1.13,1+slope)));
    }
    const a=shore(z),b=shore(z+step);
    mesh.quad([a-42,0,z],[a+7,0,z],[b+7,0,z+step],[b-42,0,z+step],'#e9c99c');
    mesh.quad([a+7,-.2,z],[a+63,-.2,z],[b+63,-.2,z+step],[b+7,-.2,z+step],'#69aba4');
    mesh.strip(a+9,z,b+9,z+step,1.5,.03,'#d7e2c6');
    row=next;
  }
  const desertRow=z=>Array.from({length:125},(_,i)=>{
    const x=8000+desertHalfWidth(z)*(i/62-1);
    return [x,groundHeight(x,z),z];
  });
  let sand=desertRow(140);
  for(let z=140;z<5060;z+=30){
    const next=desertRow(Math.min(z+30,5060));
    for(let i=0;i<sand.length-1;i++){
      const a=sand[i],b=sand[i+1],c=next[i+1],d=next[i];
      const shade=Math.max(.78,Math.min(1.18,1+(a[1]-c[1])*.014));
      mesh.quad(a,b,c,d,'#c89e6b',shade);
    }
    sand=next;
  }
  const snowRow=z=>Array.from({length:145},(_,i)=>{
    const x=5500+snowHalfWidth(z)*(i/72-1);
    return [x,groundHeight(x,z),z];
  });
  let ice=snowRow(5610);
  for(let z=5610;z<8510;z+=29){
    const next=snowRow(Math.min(z+29,8510));
    for(let i=0;i<ice.length-1;i++){
      const a=ice[i],b=ice[i+1],c=next[i+1],d=next[i];
      const slope=Math.max(.78,Math.min(1.05,1+(a[1]-c[1])*.012));
      mesh.quad(a,b,c,d,'#c5d8df',slope);
    }
    ice=next;
  }
  for(let i=0;i<21;i++){
    const z=-450+i*220;
    const height=120+60*Math.sin(i*1.3)+i%3*24;
    const a=[-700,height,z],b=[-680,125+62*Math.sin((i+1)*1.3)+(i+1)%3*24,z+220];
    const c=[-185,0,z+220],d=[-200,0,z];
    const mid=[-384,height*.39,z+91];
    mesh.triangle(a,b,mid,'#718b74');
    mesh.triangle(a,mid,d,'#607f69');
    mesh.triangle(b,c,mid,'#698b72');
    mesh.triangle(d,mid,c,'#789179');
  }
  for(let i=0;i<225;i++){
    const z=(i*97)%SIZE,x=shore(z)+32+(i*103)%650;
    mesh.strip(x,z,x+8+i%20,z+.2,1.2,-.1,i%3?'#74a6aa':'#acd0c5');
  }
}

function streets(mesh){
  for(const [width,y,tint] of [[roadWidth+11,.06,'#c8b69b'],[roadWidth,.12,'#555b5c']]){
    for(const route of routes){
      route.forEach(([x,z],i)=>{
        mesh.disc(x,z,width/2,y,tint);
        if(i)mesh.strip(...route[i-1],x,z,width,y,tint);
      });
    }
  }
  for(const route of routes){
    route.slice(1).forEach(([x,z],i)=>{
      const [ax,az]=route[i];
      const length=Math.hypot(x-ax,z-az);
      const dx=(x-ax)/length,dz=(z-az)/length;
      for(let d=9;d<length-16;d+=25){
        mesh.strip(ax+dx*d,az+dz*d,ax+dx*(d+11),az+dz*(d+11),.95,.15,'#e8c57f');
      }
      for(const side of [-1,1]){
        const offset=side*(roadWidth/2-3);
        mesh.strip(ax+dx*12+dz*offset,az+dz*12-dx*offset,x-dx*12+dz*offset,z-dz*12-dx*offset,.52,.16,'#ddd1ad');
      }
    });
  }
  for(const z of [1962,2039]){
    for(let x=1742;x<=1795;x+=6)mesh.plane(x,z,3.3,5,.19,'#cbc8b8');
  }
  for(const {x,y:z} of streetlights){
    mesh.box(x,z,.7,.7,0,13,'#53666a');
    mesh.box(x+(x<1770?1.2:-1.2),z,3.4,1.1,12.5,13.6,'#d4d2ad');
  }
}

function straitBridge(mesh,span){
  const {west,east,y,width,vertical}=span;
  const height=x=>bridgeHeight(x,span);
  mesh.swapAxes=vertical;
  function band(a,b,center,w,lift,color){
    const h1=height(a)+lift,h2=height(b)+lift;
    const l=y+center-w/2,r=y+center+w/2;
    mesh.quad([a,h1,l],[b,h2,l],[b,h2,r],[a,h1,r],color);
  }
  for(let x=west;x<east;x+=20){
    const end=Math.min(x+20,east);
    band(x,end,0,width,.2,'#505658');
    for(const side of [-1,1]){
      const offset=side*(width/2-2);
      band(x,end,offset,4,3.2,'#bdc4bd');
      for(const edge of [offset-2,offset+2]){
        const z=y+edge;
        mesh.quad([x,height(x)-1,z],[end,height(end)-1,z],
          [end,height(end)+3.2,z],[x,height(x)+3.2,z],'#9ba9a4');
      }
      band(x,end,side*(width/2-6),.95,.24,'#d9dacf');
      band(x,Math.min(x+9,end),side*31,.88,.24,'#e6e1d0');
      band(x,end,side*.9,.65,.24,'#f1bf66');
    }
  }
  for(let x=west+160;x<east-100;x+=110){
    for(const side of [-1,1]){
      mesh.box(x,y+side*39,12,9,-1,height(x),'#a6afa8');
    }
    mesh.box(x,y,15,105,height(x)-2.4,height(x)-.5,'#949f9c');
  }
  for(let x=west+260;x<east-150;x+=280){
    for(const side of [-1,1]){
      const z=y+side*(width/2-2);
      mesh.box(x,z,1.3,1.3,8,29,'#718182');
      mesh.box(x,z-side*5,1.4,11,28,29,'#718182');
    }
  }
  mesh.swapAxes=false;
}

function desertScenery(mesh){
  for(let i=0;i<690;i++){
    const x=5530+(i*173.79)%4950,z=170+(i*109.61)%4890;
    if(!isDesert(x,z)||isRoad(x,z)||buildings.some(b=>Math.abs(b.x-x)<38&&Math.abs(b.y-z)<38))continue;
    mesh.base=groundHeight(x,z);
    if(mesh.base<.8)continue;
    if(i%3===0){
      const h=4+i%7;
      branch(mesh,[x,0,z],[x,h,z],.55,.48,'#507057');
      for(const side of [-1,1]){
        branch(mesh,[x,h*.46,z],[x+side*1.6,h*.54,z],.36,.3,'#507057');
        branch(mesh,[x+side*1.6,h*.54,z],[x+side*1.8,h*.8,z],.3,.24,'#5d7757');
      }
    }else{
      const r=2+i%6;
      crown(mesh,x,.8,z,r,r*.49,r*.68,i%2?'#a46e4e':'#b58a62',i);
    }
  }
  mesh.base=0;
}

function gable(mesh,x,z,w,d,y,rise,color){
  const l=x-w/2,r=x+w/2,n=z-d/2,s=z+d/2;
  const a=[l,y,n],b=[r,y,n],c=[r,y,s],e=[l,y,s];
  const north=[x,y+rise,n],south=[x,y+rise,s];
  mesh.quad(a,north,south,e,color,.89);
  mesh.quad(north,b,c,south,color,1.06);
  mesh.triangle(a,b,north,color,.69);
  mesh.triangle(e,south,c,color,.79);
}

function facade(mesh,b,base,top,spacing,kind){
  const {x,y:z,w,d}=b;
  const glass=kind==='glass';
  for(const side of [-1,1]){
    for(let y=base;y+4<top;y+=spacing){
      for(const facingX of [true,false]){
        const span=facingX?d:w;
        const count=Math.max(2,Math.floor(span/(glass?5.1:8.2)));
        const bay=span/count;
        for(let i=0;i<count;i++){
          const offset=(i+.5)*bay-span/2;
          const wx=facingX?x+side*(w/2+.12):x+offset;
          const wz=facingX?z+offset:z+side*(d/2+.12);
          const width=bay*(glass?.89:.56);
          const tint=glass?['#6f939d','#567782','#779ca4'][(i+Math.floor(y/spacing))%3]
            : i%4===0?'#80918a':'#42606a';
          mesh.box(wx,wz,facingX?.47:width,facingX?width:.47,y,y+(glass?spacing-1.05:3.6),tint);
          const lit=(i*3+Math.round(x+z+y)+side)%7;
          if(lit>=0&&lit<4){
            const glow=mesh.windowLights;
            glow.base=mesh.base;
            glow.box(wx+(facingX?side*.22:0),wz+(facingX?0:side*.22),
              facingX?.28:width*.88,facingX?width*.88:.28,y+.16,y+(glass?spacing-1.24:3.4),
              lit===0?'#ffe6ba':lit===1?'#e8ecda':'#ffcb83');
          }
          if(!glass){
            mesh.box(wx,wz,facingX?.86:width+.65,facingX?width+.65:.86,y-.27,y,'#c8b69b');
          }
        }
      }
    }
  }
}

function downtown(mesh,b){
  const {x,y:z,w,d,h,style}=b;
  const side=b.desert?(x<7350?1:-1):(x<1770?1:-1);
  const curb=x+side*w/2;
  const lotWidth=w+10;
  mesh.box(x+side*3,z,lotWidth,d+11,-2,.48,'#aaa99a');
  if(style==='glass'){
    mesh.box(x,z,w,d,.5,11,'#aaa89d');
    mesh.box(x,z,w*.88,d*.89,11,h,'#344d55');
    facade(mesh,{...b,w:w*.88,d:d*.89},12,h,7.1,style);
    mesh.box(x,z,w*.9,d*.91,h,h+1.2,'#c3c2b5');
    mesh.box(x,z,w*.42,d*.46,h+1.2,h+8,'#758588');
    mesh.box(x-3,z+4,.65,.65,h+8,h+17,'#6b7472');
    mesh.box(curb,z,3.8,13.5,7.95,8.8,'#babbb0');
  }else if(style==='stucco'){
    mesh.box(x,z,w,d,.5,h,b.desert?'#e2b589':'#d9c4a1');
    facade(mesh,b,10,h,8,style);
    for(let y=10;y+4<h;y+=8){
      for(const shift of [-d*.27,0,d*.27]){
        mesh.box(curb+side*1.8,z+shift,4.4,7.4,y-.8,y-.16,'#e8d7bd');
        mesh.box(curb+side*3.7,z+shift,.4,7.4,y-.16,y+1.24,'#7f8883');
      }
    }
    mesh.box(x,z,w+1.45,d+1.45,h,h+1.4,'#ece0c7');
    gable(mesh,x,z,w+1.6,d+1.5,h+1.4,7,'#a05945');
  }else if(style==='brick'){
    mesh.box(x,z,w,d,.5,h,b.desert?'#ae7150':'#a36e58');
    facade(mesh,b,10,h,8.2,style);
    for(let y=8;y<h;y+=8.2){
      mesh.box(x,z,w+.22,d+.22,y-.15,y+.23,'#be8f74');
    }
    mesh.box(x,z,w+1.1,d+1.1,h,h+1.45,'#ccaa8c');
    mesh.box(x-4,z+6,w*.35,d*.32,h+1.45,h+6.2,'#826a5e');
    mesh.box(curb,z,3.5,12,7.1,8,'#6c574c');
  }else{
    mesh.box(x,z,w,d,.5,h,'#c7aa88');
    mesh.box(x,z,w+1.2,d+1.2,h-1,h+1,'#d6c0a0');
    for(let i=-2;i<=2;i++){
      mesh.box(curb+side*.17,z+i*d*.18,.45,d*.155,1.25,6.6,'#41626a');
      mesh.box(curb+side*1.8,z+i*d*.18,4,d*.183,6.45,7.34,i%2?'#e5cead':'#577c70');
    }
    mesh.box(x-2,z+4,12,9,h+1,h+3.5,'#8c8f87');
  }
  mesh.box(curb+side*.28,z,.65,7.2,.53,5.9,'#506a70');
  mesh.box(curb+side*.65,z,.45,.32,.55,5.9,'#c4baac');
  mesh.box(curb+side*3,z+d*.38,3.2,4.4,.48,1.85,'#797c69');
}

function architecture(mesh){
  for(const b of buildings){
    const {x,y:z,w,d,h,roof,style}=b;
    mesh.base=groundHeight(x,z);
    if(style){downtown(mesh,b);continue;}
    const wall=b.snow?'#987d69':roof==='#99a6a2'?'#b4c3bc':roof==='#b97964'?'#d6b59a':'#e0c39d';
    const eaves=h*.71;
    mesh.box(x,z,w+4,d+4,-3,.8,'#b2a58d');
    mesh.box(x,z,w,d,.8,eaves,wall);
    gable(mesh,x,z,w+2.2,d+2.2,eaves,h*.28,b.snow?'#d9e4e7':roof==='#99a6a2'?'#657675':'#9f624b');
    facade(mesh,b,4,eaves,8,'house');
    mesh.box(x+w*.15,z+d*.51,3.5,1.2,.8,6.5,'#685a4d');
    mesh.box(x+w*.15,z+d*.54,8,4,5.9,6.7,'#b88b6a');
    mesh.box(x-w*.22,z-d*.17,2.8,2.8,eaves,h+2,'#8f6a58');
  }
  mesh.base=0;
}

function branch(mesh,a,b,r1,r2,color){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
  const length=Math.hypot(dx,dy,dz);
  const flat=Math.hypot(dx,dz);
  const side=flat?[dz/flat,0,-dx/flat]:[1,0,0];
  const up=[-dy*side[2]/length,(dx*side[2]-dz*side[0])/length,dy*side[0]/length];
  const point=(p,r,i)=>p.map((value,j)=>value+r*(side[j]*Math.cos(i*Math.PI/3)+up[j]*Math.sin(i*Math.PI/3)));
  for(let i=0;i<6;i++)mesh.quad(point(a,r1,i),point(a,r1,i+1),point(b,r2,i+1),point(b,r2,i),color,.77+i*.06);
}

function crown(mesh,x,y,z,rx,ry,rz,color,phase){
  const ring=i=>{
    const a=i*Math.PI/3+phase;
    const rough=.83+.16*Math.sin(i*3.2+phase*4);
    return [x+Math.cos(a)*rx*rough,y+Math.sin(i*2.2+phase)*ry*.24,z+Math.sin(a)*rz*rough];
  };
  for(let i=0;i<6;i++){
    mesh.triangle([x-rx*.16,y+ry,z+rz*.13],ring(i),ring(i+1),color,.91+i*.035);
    mesh.triangle([x+rx*.12,y-ry*.69,z],ring(i+1),ring(i),color,.64+i*.035);
  }
}

function palm(mesh,x,z,height,phase){
  const foot=[x,0,z],mid=[x+Math.cos(phase)*1.6,height*.46,z+Math.sin(phase)*1.6];
  const top=[x+Math.cos(phase)*4.1,height,z+Math.sin(phase)*4.1];
  branch(mesh,foot,mid,.82,.56,'#8d7859');
  branch(mesh,mid,top,.56,.44,'#a08a69');
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9+phase;
    const length=6.8+(i%3)*1.25;
    const point=(step,side)=>{
      const t=step/5;
      const spread=Math.sin(t*Math.PI)*1.17*side;
      return [top[0]+Math.cos(a)*length*t-Math.sin(a)*spread,
        height+Math.sin(t*Math.PI)*2.6-t*t*(2.2+i%3*.41)-Math.abs(side)*.34,
        top[2]+Math.sin(a)*length*t+Math.cos(a)*spread];
    };
    for(let j=0;j<5;j++){
      for(const side of [-1,1]){
        mesh.quad(point(j,0),point(j+1,0),point(j+1,side),point(j,side),
          (i+side)%3===0?'#617b40':'#4c703f');
      }
    }
  }
}

function evergreen(mesh,x,z,h,r,phase,leaf,snow=false){
  const tips=9;
  for(let tier=0;tier<6;tier++){
    const y=h*(.29+tier*.135);
    const width=r*(.68-tier*.091);
    const a=phase+tier*.45;
    const point=i=>{
      const angle=i*Math.PI*2/tips+a;
      const spread=width*(.78+.19*Math.cos(i*2.7+tier)+.09*Math.sin(i*4.2+a));
      return [x+Math.cos(angle)*spread,y+Math.sin(i*2.3+a)*h*.057,z+Math.sin(angle)*spread];
    };
    for(let i=0;i<tips;i++){
      mesh.triangle([x+Math.sin(a)*width*.18,y+h*.31,z+Math.cos(a)*width*.19],
        point(i),point(i+1),snow&&i%4!==0?'#c1d4d9':leaf,.72+i*.035);
      const p=point(i),q=point(i+1);
      mesh.triangle([x,y-h*.039,z],p,q,'#38543d',.76+i*.025);
    }
  }
}

function vegetation(mesh){
  for(const t of trees){
    const {x,y:z,r,shade,type,snow}=t;
    mesh.base=groundHeight(x,z);
    if(isPalm(t)){
      palm(mesh,x,z,12+r*.69,shade*6.28);
      continue;
    }
    const phase=shade*6.28;
    const h=r*(1.38+shade*.47);
    const trunk=[x+r*.12*Math.cos(phase),h*.62,z+r*.12*Math.sin(phase)];
    branch(mesh,[x,0,z],trunk,r*.09,r*.045,'#79664d');
    const leaf=shade>.65?'#718854':shade>.31?'#597744':'#4b6a47';
    if(snow||type<.27){
      branch(mesh,trunk,[x,h*1.15,z],r*.045,.22,'#77644c');
      evergreen(mesh,x,z,h,r,phase,shade>.5?'#54734c':'#496646',snow);
    }else{
      for(let i=0;i<4;i++){
        const a=i*Math.PI*.5+phase;
        const cx=x+Math.cos(a)*r*.43,cz=z+Math.sin(a)*r*.43;
        const cy=h*(.68+(i%3)*.105);
        branch(mesh,trunk,[cx,cy,cz],r*.043,r*.019,'#76644c');
        crown(mesh,cx,cy+r*.11,cz,r*.53,r*.41,r*.51,leaf,a);
        crown(mesh,cx+Math.cos(a)*r*.26,cy+r*.29,cz+Math.sin(a)*r*.26,r*.37,r*.28,r*.34,
          i%2?'#6d8752':leaf,a+.7);
      }
      crown(mesh,x,h*.99,z,r*.49,r*.43,r*.49,leaf,phase);
    }
  }
  for(let i=0;i<10;i++){
    const x=1725+(i%2)*90,z=1640+i*73;
    mesh.base=groundHeight(x,z);
    palm(mesh,x,z,16+i%4*3,i*2.3);
  }
  mesh.base=0;
}

function landmarks(mesh){
  const {x,y:z,w,d}=airfield;
  mesh.plane(x-w/2-7,z-d/2-7,w+14,d+14,.07,'#a49e82');
  mesh.plane(x-w/2,z-d/2,w,d,.13,'#646b66');
  for(let offset=-d/2+48;offset<d/2-45;offset+=36){
    mesh.plane(x-.83,z+offset,1.66,18,.17,'#e5dfc9');
  }
  for(const end of [-1,1]){
    const mark=z+end*(d/2-19);
    for(let i=-4;i<=4;i++)mesh.plane(x+i*7-1.8,mark-6,3.6,12,.17,'#e5dfc9');
  }
  mesh.plane(hangar.x-36,hangar.y-37,118,85,.18,'#8b8b7b');
  mesh.box(hangar.x,hangar.y,hangar.w,hangar.d,-2,18,'#908d7e');
  gable(mesh,hangar.x,hangar.y,hangar.w+2,hangar.d+2,18,8,'#68777a');
  mesh.box(hangar.x,hangar.y+hangar.d/2,.85+hangar.w*.69,.55,.2,13,'#4e646a');
  for(let i=-4;i<=4;i++)mesh.box(hangar.x+i*5.2,hangar.y+hangar.d/2+.33,.42,.24,.3,12.7,'#a7aba0');
  const beacon=lighthouse;
  mesh.base=groundHeight(beacon.x,beacon.y);
  mesh.box(beacon.x,beacon.y,25,25,-3,.34,'#ab9c81');
  for(let i=0;i<5;i++){
    branch(mesh,[beacon.x,i*8,beacon.y],[beacon.x,(i+1)*8,beacon.y],10-i*.9,9.1-i*.9,
      i%2?'#a34e40':'#e4d9bf');
  }
  mesh.disc(beacon.x,beacon.y,8.1,40.15,'#a9a38c');
  branch(mesh,[beacon.x,40,beacon.y],[beacon.x,46,beacon.y],5.3,5.3,'#577f83');
  mesh.cone(beacon.x,beacon.y,6.7,46,5,'#884a40',8);
  mesh.box(beacon.x,beacon.y,5,4,-.2,6,'#62584d');
  mesh.base=0;
}

function roadside(mesh){
  const palette=['#899150','#657843','#a49d62','#767d49'];
  let seed=149;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
  for(let i=0;i<7900;i++){
    const x=random()*SIZE,z=random()*SIZE;
    if(x>shore(z)-47||buildings.some(b=>Math.abs(x-b.x)<b.w/2+7&&Math.abs(z-b.y)<b.d/2+7))continue;
    const elevation=groundHeight(x,z);
    if(elevation<.28)continue;
    mesh.base=elevation-.15;
    if(i%18===0){
      const r=1.8+random()*4.1;
      crown(mesh,x,r*.16,z,r,r*.59,r*.68,i%2?'#8f8d79':'#aaa58b',random()*6.28);
    }else{
      const height=.85+random()*2.1;
      for(let j=0;j<4;j++){
        const a=random()*6.28,dx=Math.cos(a),dz=Math.sin(a);
        mesh.triangle([x-dz*.27,0,z+dx*.27],[x+dz*.27,0,z-dx*.27],
          [x+dx*height*.46,height*(.45+random()*.65),z+dz*height*.46],palette[(i+j)%4]);
      }
    }
  }
  mesh.base=0;
}

export const WHEEL_RADIUS=2.75;
const axles=[-10,9.7];
const track=4.93;

function makeShadow(){
  const mesh=new Mesh();
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
    mesh.triangle([0,.18,0],[18.5*Math.cos(a),.18,8.9*Math.sin(a)],
      [18.5*Math.cos(b),.18,8.9*Math.sin(b)],'#3d4545');
  }
  return mesh;
}

function bodySection(x,width,bottom,shoulder,top,arch){
  const side=arch>bottom?width*.99:width*.88;
  return [[x,Math.max(bottom,arch),-side],[x,Math.max(shoulder,arch+.12),-width],[x,top,-width*.83],
    [x,top,width*.83],[x,Math.max(shoulder,arch+.12),width],[x,Math.max(bottom,arch),side]];
}

const singleExhaust=[-4.2];

function makeCar({paint,roof,cabin,spoiler,rails,rugged,exhausts=singleExhaust,beltLift=rugged?1.9:0}){
  const m=new Mesh();
  const profile=[
    [-16.7,5.6,2.25,4.15,5.15],
    [-14.8,6.6,2.05,4.95,6.02],
    [-10,7.35,2.25,5.62,6.27],
    [-5.8,6.9,2.23,5.18,6.34],
    [4.7,6.73,2.26,5.17,6.35],
    [9.7,7.43,2.24,5.62,6.25],
    [13.4,6.84,2.25,4.95,5.96],
    [16.65,5.65,2.15,4.14,4.95],
  ];
  const archRadius=3.22;
  const archPoints=axles.flatMap(axle=>Array.from({length:13},(_,i)=>axle+archRadius*Math.cos(i*Math.PI/12)));
  const positions=[...new Set([...profile.map(([x])=>x),...archPoints])].sort((a,b)=>a-b);
  const sections=positions.map(x=>{
    const right=profile.findIndex(([position])=>position>=x);
    const start=profile[Math.max(0,right-1)],end=profile[right];
    const fraction=right===0?0:(x-start[0])/(end[0]-start[0]);
    const dimensions=start.slice(1).map((value,i)=>value+(end[i+1]-value)*fraction);
    dimensions[2]+=beltLift*.76;
    dimensions[3]+=beltLift;
    const offset=Math.min(...axles.map(axle=>Math.abs(x-axle)));
    const arch=offset<=archRadius+.0001
      ? WHEEL_RADIUS+.14+Math.sqrt(Math.max(0,archRadius**2-offset**2))
      : 0;
    return bodySection(x,...dimensions,arch);
  });
  for(let i=1;i<sections.length;i++){
    const previous=sections[i-1],next=sections[i];
    for(let f=0;f<5;f++)m.quad(previous[f],next[f],next[f+1],previous[f+1],paint[f]);
    for(const edge of [0,5]){
      const a=previous[edge],b=next[edge];
      if(a[1]<2.5&&b[1]<2.5)continue;
      const inside=([x,y,z])=>[x,y-.13,z-Math.sign(z)*.68];
      m.quad(a,b,inside(b),inside(a),paint[0]);
    }
  }
  for(const end of [0,sections.length-1]){
    const face=sections[end];
    for(let i=1;i<face.length-1;i++)m.triangle(face[0],face[i],face[i+1],paint[3]);
  }
  const [roofFront,roofRear,glassRear,roofHeight]=cabin;
  const front=[5.8,6.21+beltLift,4.95],rear=[glassRear,6.06+beltLift,4.96];
  const nw=[roofFront,roofHeight+.06,-3.86],ne=[roofFront,roofHeight+.06,3.86];
  const sw=[roofRear,roofHeight,-3.94],se=[roofRear,roofHeight,3.94];
  m.quad([front[0],front[1],-front[2]],front,ne,nw,'#526f79');
  m.quad([rear[0],rear[1],-rear[2]],rear,se,sw,'#324e5c');
  m.quad(nw,ne,se,sw,roof);
  if(spoiler){
    for(const z of [-3.5,3.5])m.box(-15,z,.85,.7,5.7,7.1,'#343d41');
    m.box(-15,0,2.3,12.7,7.06,7.59,paint[1]);
  }
  if(rails){
    for(const z of [-3,3]){
      for(const x of [-10,0])m.box(x,z,.8,.6,roofHeight,roofHeight+.75,'#444e50');
      m.box(-5,z,12,.46,roofHeight+.7,roofHeight+1.04,'#586366');
    }
  }
  for(const side of [-1,1]){
    const lower=(x,y,z)=>[x,y,z*side];
    const a=lower(front[0],front[1],5),b=lower(rear[0],rear[1],5),c=lower(roofRear,roofHeight,3.94),d=lower(roofFront,roofHeight+.06,3.86);
    m.quad(a,b,c,d,side===1?'#496771':'#65818a');
    const pillarX=(roofFront+roofRear)/2;
    m.quad(lower(pillarX-.24,6.15+beltLift,5.02),lower(pillarX+.24,6.15+beltLift,5.02),
      lower(pillarX+.24,roofHeight+.03,3.94),lower(pillarX-.24,roofHeight+.03,3.94),paint[1]);
    m.box(3.35,side*6.1,1.9,1.45,6.4+beltLift,7.15+beltLift,paint[1]);
    m.box(-3.15,side*6.21,1.15,.28,4.8+beltLift*.65,5.08+beltLift*.65,'#dec0a1');
    m.box(-.55,side*6.05,9.1,.35,2.21,2.63,'#393e40');
    m.box(-2.4,side*6.2,.11,.12,2.68,4.61,'#693b33');
  }
  m.box(-16.72,0,.85,11.25,1.85,2.42,'#343d41');
  m.box(16.68,0,.65,10.7,2.0,2.52,'#303c40');
  m.box(-16.71,0,.26,9.8,3.08,4.64,'#403c3a');
  m.box(-16.9,0,.14,2.92,3.08,3.74,'#e0d6b8');
  m.box(16.72,0,.19,5.3,2.95,3.77,'#252f32');
  for(const z of [-3.85,3.85]){
    m.box(-16.94,z,.21,2.08,3.55,4.53,'#a82729');
    m.box(-17.07,z,.15,1.78,3.7,4.0,'#e73d37');
    if(rugged){
      const side=Math.sign(z);
      m.box(16.76,z,.31,2.75,4.14,5.73,'#24333b');
      m.box(16.95,z,.17,2.42,4.35,5.53,'#6c8795');
      m.box(17.06,z-side*.34,.12,1.17,4.61,5.23,'#e8f3f5');
      m.box(17.08,z,.11,2.47,5.38,5.57,'#f2fbff');
      m.box(17.08,z+side*1.12,.11,.22,4.44,5.47,'#f2fbff');
      m.box(17.04,z+side*.83,.11,.35,4.4,4.65,'#d99047');
    }else{
      m.box(16.72,z,.21,2.25,3.88,4.66,'#e9dfbf');
    }
  }
  if(rugged){
    for(const z of [-6.6,6.6])m.box(0,z,11,.8,1.65,2.45,'#2d363b');
    m.box(17,0,.9,10.3,2.24,3.25,'#404b50');
    m.box(-17,0,.65,10.3,1.85,2.7,'#404b50');
  }
  for(const side of exhausts){
    m.box(-16.65,side,1.65,.89,1.5,2.01,'#839194');
    m.box(-17.49,side,.13,.61,1.62,1.89,'#262d30');
  }
  return m;
}

function makeBrakeLights(){
  const m=new Mesh();
  for(const z of [-3.85,3.85])m.box(-17.13,z,.12,2.02,3.6,4.49,'#ff533d');
  m.box(-10.6,0,.18,2.4,6.23,6.46,'#ff6049');
  return m;
}

function makeWheel({spokes,split=false,rim,finish,lip,inner,outer,sweep=0,bolts=false}){
  const m=new Mesh();
  const point=(r,a,z)=>[r*Math.cos(a),r*Math.sin(a),z];
  const rings=[[WHEEL_RADIUS-.43,-1.56],[WHEEL_RADIUS,-1.11],[WHEEL_RADIUS,1.11],[WHEEL_RADIUS-.43,1.56]];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    for(let j=1;j<rings.length;j++){
      const [r1,z1]=rings[j-1],[r2,z2]=rings[j];
      const color=j===2?(i%2?'#292e30':'#363b3e'):'#22272b';
      m.quad(point(r1,a,z1),point(r1,b,z1),point(r2,b,z2),point(r2,a,z2),color);
    }
    for(const side of [-1,1]){
      const z=side*1.57;
      m.quad(point(rim,a,z),point(rim,b,z),point(rings[0][0],b,z),point(rings[0][0],a,z),'#282e32');
      m.triangle([0,0,z],point(rim,a,z),point(rim,b,z),'#414b51');
      m.quad(point(rim,a,z+side*.04),point(rim,b,z+side*.04),
        point(rim-.2,b,z+side*.04),point(rim-.2,a,z+side*.04),lip);
    }
  }
  for(const side of [-1,1]){
    const z=side*1.62;
    for(let i=0;i<spokes;i++){
      const a=i*Math.PI*2/spokes;
      for(const branch of (split?[-1,1]:[0])){
        const root=a+branch*.075;
        const tip=a+side*sweep+branch*.13;
        m.quad(point(.28,root-inner,z),point(rim-.09,tip-outer,z),
          point(rim-.09,tip+outer,z),point(.28,root+inner,z),finish);
      }
    }
    if(bolts){
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        const radius=rim-.125;
        const x=radius*Math.cos(a),y=radius*Math.sin(a),face=z+side*.014;
        m.quad([x-.055,y-.055,face],[x+.055,y-.055,face],
          [x+.055,y+.055,face],[x-.055,y+.055,face],'#c2ccce');
      }
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      m.triangle([0,0,z+side*.03],point(.36,a,z+side*.03),point(.36,b,z+side*.03),finish);
    }
  }
  return m;
}

function makeGate(){
  const m=new Mesh();
  for(const x of [-23,23]){
    m.box(x,0,2.3,2.3,0,17,'#f8b644');
    m.box(x,0,4,4,0,1.2,'#ba8951');
  }
  m.box(0,0,48,2,16,18,'#ffcb65');
  m.quad([-3,17,0],[0,21,0],[3,17,0],[0,13,0],'#fff0a4');
  return m;
}

function shader(gl,type,source){
  const object=gl.createShader(type);
  gl.shaderSource(object,source);
  gl.compileShader(object);
  if(!gl.getShaderParameter(object,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(object));
  return object;
}

export function makeScene(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true});
  if(!gl)return null;
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,`
    attribute vec3 position;
    attribute vec3 color;
    uniform vec3 eye, right, up, forward, origin;
    uniform vec2 turn, spin;
    uniform float aspect, zoom;
    uniform mediump float smokeScale;
    varying vec3 tint;
    varying float depth;
    varying vec2 surface;
    varying vec3 worldPosition;
    void main(){
      vec3 local=vec3(position.x*spin.x-position.y*spin.y, position.x*spin.y+position.y*spin.x, position.z);
      worldPosition=vec3(local.x*turn.x-local.z*turn.y,local.y,local.x*turn.y+local.z*turn.x)+origin;
      vec3 p=worldPosition-eye;
      float z=dot(p,forward);
      gl_Position=vec4(dot(p,right)*zoom/aspect,dot(p,up)*zoom,z*1.001-2.001,z);
      if(smokeScale>0.0){
        float size=color.y==3.0?5.0+color.x*2.0:2.0+color.x*(color.y>0.5?12.0:7.0);
        gl_PointSize=clamp(size*smokeScale/max(z,1.0),1.0,84.0);
      }
      tint=color;
      depth=z;
      surface=position.xz;
    }
  `));
  gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,`
    precision mediump float;
    uniform vec3 haze;
    uniform float terrainTexture, dusk, night, lamps, emissive;
    uniform vec3 headlightOrigin;
    uniform vec2 headlightDirection;
    uniform mediump float smokeScale;
    varying vec3 tint;
    varying float depth;
    varying vec2 surface;
    varying vec3 worldPosition;
    void main(){
      float fog=smoothstep(220.0,1350.0,depth);
      if(smokeScale>0.0){
        float radius=length(gl_PointCoord-vec2(0.5));
        float edge=1.0-smoothstep(0.06,0.5,radius);
        vec3 smoke=tint.y>1.5?vec3(0.82,0.89,0.92)
          :tint.y>0.5?vec3(0.67,0.57,0.43):vec3(0.72,0.75,0.76);
        float alpha=edge*edge*(1.0-tint.x)*tint.z;
        if(tint.y==4.0)smoke=vec3(0.055,0.062,0.068);
        if(tint.y==3.0){
          smoke=mix(vec3(1.0,0.91,0.49),vec3(1.0,0.22,0.025),smoothstep(0.03,0.5,radius));
          alpha=edge*(1.0-tint.x)*tint.z;
        }
        gl_FragColor=vec4(smoke,alpha);
        return;
      }
      float texture=sin(surface.x*.12+sin(surface.y*.17))*cos(surface.y*.145+sin(surface.x*.18));
      float grain=sin(surface.x*.75+surface.y*1.12)*cos(surface.y*.82-surface.x*.55);
      float meadow=sin(surface.x*.024+sin(surface.y*.031))*cos(surface.y*.028+sin(surface.x*.022));
      float field=step(0.0,tint.g-tint.b);
      float shade=1.0+terrainTexture*(meadow*.097*field+texture*.039+grain*.027*(1.0-smoothstep(40.0,160.0,depth)));
      if(emissive>0.0){
        gl_FragColor=vec4(mix(tint,haze,fog*.55),emissive*(1.0-fog*.8));
        return;
      }
      vec3 sunlight=mix(vec3(1.0),vec3(1.06,0.79,0.65),dusk*.69);
      sunlight=mix(sunlight,vec3(0.24,0.32,0.49),night*.89);
      vec2 delta=worldPosition.xz-headlightOrigin.xz;
      float forwardDistance=dot(delta,headlightDirection);
      float sideDistance=abs(dot(delta,vec2(-headlightDirection.y,headlightDirection.x)));
      float spread=7.0+max(0.0,forwardDistance)*0.21;
      float cone=(1.0-smoothstep(spread*.3,spread,sideDistance))
        *smoothstep(0.0,15.0,forwardDistance)*(1.0-smoothstep(40.0,148.0,forwardDistance));
      float nearGround=1.0-smoothstep(8.0,21.0,worldPosition.y-headlightOrigin.y);
      vec3 lit=tint*shade*sunlight+vec3(1.0,0.91,0.7)*cone*nearGround*lamps*.57;
      gl_FragColor=vec4(mix(lit,haze,fog*.94),1.0);
    }
  `));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const uniforms=Object.fromEntries('eye right up forward origin turn spin aspect zoom haze terrainTexture smokeScale dusk night lamps emissive headlightOrigin headlightDirection'.split(' ').map(name=>[name,gl.getUniformLocation(program,name)]));
  const attributes=['position','color'].map(name=>gl.getAttribLocation(program,name));
  attributes.forEach(attribute=>gl.enableVertexAttribArray(attribute));

  function upload(mesh){
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices),gl.STATIC_DRAW);
    return {buffer,count:mesh.vertices.length/6};
  }
  function buildMesh(build){
    const mesh=new Mesh();
    build(mesh);
    return upload(mesh);
  }

  const landscape=buildMesh(terrain);
  const windowLights=new Mesh();
  const world=buildMesh(mesh=>{
    mesh.windowLights=windowLights;
    streets(mesh);
    for(const span of bridges)straitBridge(mesh,span);
    architecture(mesh);
    desertScenery(mesh);
    landmarks(mesh);
    vegetation(mesh);
    roadside(mesh);
  });
  const windows=upload(windowLights);
  windowLights.vertices=[];
  const vehicles=CARS.map(model=>{
    const {length=1,width=1}=model;
    const uploadScaled=mesh=>{
      for(let i=0;i<mesh.vertices.length;i+=6){
        mesh.vertices[i]*=length;
        mesh.vertices[i+2]*=width;
      }
      return upload(mesh);
    };
    const headlights=new Mesh();
    for(const z of [-3.85,3.85]){
      if(model.rugged){
        headlights.box(17.17,z-Math.sign(z)*.34,.06,1.15,4.61,5.23,'#f6fcff');
        headlights.box(17.16,z,.05,2.45,5.38,5.57,'#eaf7ff');
      }else headlights.box(16.86,z,.04,2.16,3.94,4.64,'#fff5cb');
    }
    return {length,width,wheel:upload(makeWheel(model.alloy)),body:uploadScaled(makeCar(model)),
      brakeLights:uploadScaled(makeBrakeLights()),headlights:uploadScaled(headlights),shadow:uploadScaled(makeShadow())};
  });
  const patrolBody=upload(makeCar({...CARS[0],paint:POLICE_PAINT,roof:'#d1dce3'}));
  const lightBar=new Mesh();
  lightBar.box(-2.7,0,2.8,9,9.7,10.22,'#26303b');
  const redLamp=new Mesh(),blueLamp=new Mesh();
  redLamp.box(-2.7,-2.6,2.45,3.3,10.16,10.82,'#ff4a4e');
  blueLamp.box(-2.7,2.6,2.45,3.3,10.16,10.82,'#468dff');
  const policeBar=upload(lightBar),redStrobe=upload(redLamp),blueStrobe=upload(blueLamp);
  const gate=upload(makeGate());

  function draw({buffer,count},x=0,z=0,angle=0,height=0,roll=0){
    gl.uniform3f(uniforms.origin,x,height,z);
    gl.uniform2f(uniforms.spin,Math.cos(roll),Math.sin(roll));
    gl.uniform2f(uniforms.turn,Math.cos(angle),Math.sin(angle));
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    attributes.forEach((attribute,i)=>gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,i*12));
    gl.drawArrays(gl.TRIANGLES,0,count);
  }

  const smokeBuffer=gl.createBuffer();
  const particleLimit=64;
  const smokeData=new Float32Array(particleLimit*6);
  let particles=[],exhaustClock=0,dustClock=0,flameClock=0,lastEmission=null;

  function drawSmoke(car,length,width,elevation,dt,road,exhausts,flames,blackExhaust){
    if(lastEmission?.generation!==car.smokeGeneration){
      particles=[];
      exhaustClock=0;
      dustClock=0;
      flameClock=0;
    }
    const previous=lastEmission?.generation===car.smokeGeneration?lastEmission:null;
    lastEmission={x:car.x,z:car.y,generation:car.smokeGeneration};
    for(const puff of particles){
      puff.age+=dt;
      puff.x+=puff.vx*dt;
      puff.z+=puff.vz*dt;
      puff.y+=puff.rise*dt;
    }
    particles=particles.filter(puff=>puff.age<puff.life);
    const speed=Math.abs(car.speed);
    const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    function emit(back,side,height,kind,offset){
      const mix=dt>0?offset/dt:0;
      const x=car.x+(previous?previous.x-car.x:0)*mix;
      const z=car.y+(previous?previous.z-car.y:0)*mix;
      const flame=kind===3;
      const dust=kind===1||kind===2;
      const drift=flame?23:dust?4:7;
      particles.push({
        x:x-back*cos-side*sin,y:elevation+height,z:z-back*sin+side*cos,
        vx:-cos*drift,vz:-sin*drift,rise:flame?.8:dust?3.3:5.1,
        age:0,life:flame?.11:dust?.92:.65,kind,opacity:flame?.88:kind===4?.62:dust?.28:.22
      });
    }
    if(speed>6){
      const interval=Math.max(.045,.14-speed*.00036);
      exhaustClock+=dt;
      while(exhaustClock>=interval){
        exhaustClock-=interval;
        for(const side of exhausts)emit(17.6*length,side*width,1.8,blackExhaust?4:0,exhaustClock);
      }
    }else exhaustClock=0;
    if(flames&&car.speed>12){
      flameClock+=dt;
      while(flameClock>=.045){
        flameClock-=.045;
        for(const side of exhausts)emit(18.1*length,side*width,1.8,3,flameClock);
      }
    }else flameClock=0;
    if(!road&&speed>22){
      dustClock+=dt;
      const kind=isSnow(car.x,car.y)?2:1;
      while(dustClock>=.066){
        dustClock-=.066;
        for(const side of [-1,1])emit(11.8*length,side*track*width,1.15,kind,dustClock);
      }
    }else dustClock=0;
    if(particles.length>particleLimit)particles.splice(0,particles.length-particleLimit);
    if(!particles.length)return;

    particles.forEach((puff,i)=>smokeData.set([
      puff.x,puff.y,puff.z,puff.age/puff.life,puff.kind,puff.opacity
    ],i*6));
    gl.uniform3f(uniforms.origin,0,0,0);
    gl.uniform2f(uniforms.spin,1,0);
    gl.uniform2f(uniforms.turn,1,0);
    gl.uniform1f(uniforms.smokeScale,canvas.height*.865);
    gl.bindBuffer(gl.ARRAY_BUFFER,smokeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,smokeData.subarray(0,particles.length*6),gl.DYNAMIC_DRAW);
    attributes.forEach((attribute,i)=>gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,i*12));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS,0,particles.length);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform1f(uniforms.smokeScale,0);
  }

  return {
    render(cam,car,targets,wide,orbit,dt=0,road=true,accelerating=false,seconds=0,patrols=[],time=0,civilians=[]){
      if(canvas.width===0||canvas.height===0)return;
      const preview=orbit!==null;
      const viewAngle=preview?orbit:cam.angle;
      const fx=Math.cos(viewAngle),fz=Math.sin(viewAngle);
      const pitch=preview?.34:wide?.55:.255;
      const cp=Math.cos(pitch),sp=Math.sin(pitch);
      const aspect=canvas.width/canvas.height;
      const distance=preview?50:(wide?115:62)+Math.abs(car.speed)*.095;
      const elevation=groundHeight(car.x,car.y);
      const height=elevation+(preview?23:wide?78:29);
      const light=daylight(seconds);
      const carX=Math.cos(car.angle),carZ=Math.sin(car.angle);
      const headlamps=preview?0:light.lamps;
      gl.uniform3fv(uniforms.haze,light.sky);
      gl.uniform1f(uniforms.dusk,light.dusk);
      gl.uniform1f(uniforms.night,light.night);
      gl.uniform1f(uniforms.lamps,headlamps);
      gl.uniform3f(uniforms.headlightOrigin,car.x+carX*17,elevation,car.y+carZ*17);
      gl.uniform2f(uniforms.headlightDirection,carX,carZ);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(...light.sky,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(uniforms.eye,cam.x-fx*distance,height,cam.y-fz*distance);
      gl.uniform3f(uniforms.right,-fz,0,fx);
      gl.uniform3f(uniforms.up,fx*sp,cp,fz*sp);
      gl.uniform3f(uniforms.forward,fx*cp,-sp,fz*cp);
      gl.uniform1f(uniforms.aspect,aspect);
      gl.uniform1f(uniforms.zoom,preview?Math.min(1.53,aspect*2.02):1.73);
      gl.uniform1f(uniforms.terrainTexture,1);
      draw(landscape);
      gl.uniform1f(uniforms.terrainTexture,0);
      draw(world);
      if(light.lamps>0){
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(uniforms.emissive,light.lamps*.94);
        draw(windows);
        gl.uniform1f(uniforms.emissive,0);
        gl.disable(gl.BLEND);
      }
      if(targets.length){
        gl.uniform1f(uniforms.emissive,Math.max(.01,light.lamps));
        for(const target of targets)draw(gate,target.x,target.y,target.angle);
        gl.uniform1f(uniforms.emissive,0);
      }
      for(const [index,patrol] of [...patrols,...civilians.filter(other=>other.police)].entries()){
        const {x,y,angle,wheelSpin}=patrol;
        if(Math.abs(x-cam.x)>900||Math.abs(y-cam.y)>900)continue;
        const elevation=groundHeight(x,y);
        draw(patrolBody,x,y,angle,elevation);
        draw(policeBar,x,y,angle,elevation);
        const flash=patrol.traffic?null:(Math.floor(time/140)+index)%2;
        gl.uniform1f(uniforms.emissive,flash===null?0:flash?.98:.35);
        draw(redStrobe,x,y,angle,elevation);
        gl.uniform1f(uniforms.emissive,flash===null?0:flash?.35:.98);
        draw(blueStrobe,x,y,angle,elevation);
        gl.uniform1f(uniforms.emissive,0);
        const c=Math.cos(angle),s=Math.sin(angle);
        for(const axle of axles)for(const offset of [-track,track]){
          const wx=x+axle*c-offset*s,wz=y+axle*s+offset*c;
          draw(vehicles[0].wheel,wx,wz,angle,groundHeight(wx,wz)+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      for(const other of civilians){
        if(other.police||Math.abs(other.x-cam.x)>800||Math.abs(other.y-cam.y)>800)continue;
        const {x,y,angle,model,wheelSpin,braking}=other;
        const {length,width,body,wheel,brakeLights,headlights,shadow}=vehicles[model];
        const base=groundHeight(x,y);
        const cos=Math.cos(angle),sin=Math.sin(angle);
        draw(shadow,x,y,angle,base);
        draw(body,x,y,angle,base);
        if(light.lamps>0){
          gl.uniform1f(uniforms.emissive,light.lamps);
          draw(headlights,x,y,angle,base);
          gl.uniform1f(uniforms.emissive,0);
        }
        if(braking)draw(brakeLights,x,y,angle,base);
        for(const axle of axles)for(const offset of [-track,track]){
          const wx=x+axle*length*cos-offset*width*sin,wz=y+axle*length*sin+offset*width*cos;
          draw(wheel,wx,wz,angle,groundHeight(wx,wz)+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      const {x,y:z,angle,wheelSpin,steer,braking,pitch:bodyPitch}=car;
      const cos=Math.cos(angle),sin=Math.sin(angle);
      const {length,width,body,wheel,brakeLights,headlights,shadow}=vehicles[car.model??0];
      const rear=groundHeight(x+axles[0]*length*cos,z+axles[0]*length*sin);
      const front=groundHeight(x+axles[1]*length*cos,z+axles[1]*length*sin);
      const slope=Math.atan2(front-rear,(axles[1]-axles[0])*length);
      const bodyHeight=(front+rear)/2;
      draw(shadow,x,z,angle,bodyHeight,slope);
      draw(body,x,z,angle,bodyHeight,bodyPitch+slope);
      if(headlamps>0){
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(uniforms.emissive,headlamps);
        draw(headlights,x,z,angle,bodyHeight,bodyPitch+slope);
        gl.uniform1f(uniforms.emissive,0);
        gl.disable(gl.BLEND);
      }
      if(braking){
        gl.uniform1f(uniforms.emissive,light.lamps);
        draw(brakeLights,x,z,angle,bodyHeight,bodyPitch+slope);
        gl.uniform1f(uniforms.emissive,0);
      }
      for(const offsetX of axles){
        for(const offsetZ of [-track,track]){
          const wx=x+offsetX*length*cos-offsetZ*width*sin,wz=z+offsetX*length*sin+offsetZ*width*cos;
          draw(wheel,wx,wz,angle+(offsetX>0?steer:0),groundHeight(wx,wz)+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      if(!preview){
        const model=CARS[car.model??0];
        drawSmoke(car,length,width,bodyHeight,dt,road,model.exhausts??singleExhaust,accelerating&&model.flameExhaust,model.blackExhaust);
      }
    },
    destroy(){
      gl.deleteBuffer(smokeBuffer);
      for(const mesh of [landscape,world,windows,gate,patrolBody,policeBar,redStrobe,blueStrobe])gl.deleteBuffer(mesh.buffer);
      for(const {body,wheel,brakeLights,headlights,shadow} of vehicles){
        for(const mesh of [body,wheel,brakeLights,headlights,shadow])gl.deleteBuffer(mesh.buffer);
      }
      gl.deleteProgram(program);
    }
  };
}
