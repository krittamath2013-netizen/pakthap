/* ---------- ฟังก์ชันสถิติ (ไม่ใช้ไลบรารีภายนอก) ---------- */
const STAT = (function(){
  function lnGamma(z){
    const g=7, c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
    if(z<0.5) return Math.log(Math.PI/Math.sin(Math.PI*z))-lnGamma(1-z);
    z-=1; let x=c[0]; for(let i=1;i<g+2;i++) x+=c[i]/(z+i);
    const t=z+g+0.5; return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
  }
  function betacf(x,a,b){
    const MAXIT=300, EPS=3e-14, FPMIN=1e-300;
    let qab=a+b, qap=a+1, qam=a-1, c=1, d=1-qab*x/qap; if(Math.abs(d)<FPMIN)d=FPMIN; d=1/d; let h=d;
    for(let m=1;m<=MAXIT;m++){
      const m2=2*m; let aa=m*(b-m)*x/((qam+m2)*(a+m2));
      d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
      d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; const del=d*c; h*=del;
      if(Math.abs(del-1)<EPS) break;
    }
    return h;
  }
  function ibeta(x,a,b){ // regularized incomplete beta I_x(a,b)
    if(x<=0) return 0; if(x>=1) return 1;
    const bt=Math.exp(lnGamma(a+b)-lnGamma(a)-lnGamma(b)+a*Math.log(x)+b*Math.log(1-x));
    return x<(a+1)/(a+b+2) ? bt*betacf(x,a,b)/a : 1-bt*betacf(1-x,b,a)/b;
  }
  function gammaP(a,x){ // regularized lower incomplete gamma
    if(x<=0) return 0;
    if(x<a+1){ let sum=1/a, del=sum, ap=a; for(let n=0;n<500;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*3e-14)break;} return sum*Math.exp(-x+a*Math.log(x)-lnGamma(a)); }
    let b=x+1-a, c=1/1e-300, d=1/b, h=d;
    for(let i=1;i<500;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break;}
    return 1-Math.exp(-x+a*Math.log(x)-lnGamma(a))*h;
  }
  const pT = (t,df)=> ibeta(df/(df+t*t), df/2, 0.5);              // สองทาง
  const pF = (F,d1,d2)=> F<=0?1:ibeta(d2/(d2+d1*F), d2/2, d1/2);
  const pChi = (x,df)=> 1-gammaP(df/2, x/2);
  const mean = a=> a.reduce((s,v)=>s+v,0)/a.length;
  const sd = a=>{ if(a.length<2) return NaN; const m=mean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1)); };

  function welch(a,b){
    const n1=a.length,n2=b.length; if(n1<2||n2<2) return null;
    const m1=mean(a),m2=mean(b),v1=sd(a)**2,v2=sd(b)**2, se=Math.sqrt(v1/n1+v2/n2);
    if(!(se>0)) return null;
    const t=(m1-m2)/se, df=(v1/n1+v2/n2)**2/((v1/n1)**2/(n1-1)+(v2/n2)**2/(n2-1));
    return {test:'t',stat:t,df:df,p:pT(t,df)};
  }
  function anova(groups){
    const gs=groups.filter(g=>g.length>=2); if(gs.length<2) return null;
    const all=[].concat(...gs), gm=mean(all), N=all.length, k=gs.length;
    let ssb=0, ssw=0; gs.forEach(g=>{const m=mean(g);ssb+=g.length*(m-gm)**2;g.forEach(v=>ssw+=(v-m)**2);});
    const d1=k-1, d2=N-k; if(d2<1||ssw===0) return null;
    const F=(ssb/d1)/(ssw/d2); return {test:'F',stat:F,df:[d1,d2],p:pF(F,d1,d2)};
  }
  function chisq(table){ // table: rows × cols counts
    const rows=table.filter(r=>r.reduce((s,v)=>s+v,0)>0);
    const nc=table[0].length, colT=Array(nc).fill(0); rows.forEach(r=>r.forEach((v,j)=>colT[j]+=v));
    const cols=colT.map((v,j)=>v>0?j:-1).filter(j=>j>=0);
    if(rows.length<2||cols.length<2) return null;
    const N=rows.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0);
    let x=0, small=0, cells=0;
    rows.forEach(r=>{const rt=r.reduce((a,b)=>a+b,0);cols.forEach(j=>{const e=rt*colT[j]/N;cells++;if(e<5)small++;x+=(r[j]-e)**2/e;});});
    const df=(rows.length-1)*(cols.length-1);
    return {test:'χ²',stat:x,df:df,p:pChi(x,df),smallPct:small/cells*100,V:Math.sqrt(x/(N*Math.min(rows.length-1,cols.length-1)))};
  }
  function pearson(x,y){
    const n=x.length; if(n<3) return null; const mx=mean(x),my=mean(y);
    let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2;syy+=(y[i]-my)**2;}
    if(!sxx||!syy) return null; const r=sxy/Math.sqrt(sxx*syy), t=r*Math.sqrt((n-2)/(1-r*r||1e-12));
    return {r:r,n:n,p:pT(t,n-2)};
  }
  return {mean,sd,welch,anova,chisq,pearson,pT,pF,pChi};
})();
