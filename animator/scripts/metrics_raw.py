import subprocess, sys, json
import numpy as np
def frames(path, fps=10, w=54, h=96):
    raw = subprocess.run(["ffmpeg","-v","error","-i",path,"-vf",f"fps={fps},scale={w}:{h}","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(-1,h,w,3).astype(np.float32)
def hue_hist(f):
    r,g,b=f[...,0]/255,f[...,1]/255,f[...,2]/255
    mx=np.max(f,axis=-1)/255; mn=np.min(f,axis=-1)/255; d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    sat=d/(mx+1e-6)
    m=(sat>0.35)&(mx>0.25)
    hist,_=np.histogram(h[m],bins=12,range=(0,360))
    return hist/ (hist.sum()+1e-6)
for name,path in [("ref",sys.argv[1]),("ours",sys.argv[2])]:
    F=frames(path); fps=10; dur=len(F)/fps
    diff=np.abs(np.diff(F,axis=0)).mean(axis=(1,2,3))
    thr=max(28, np.percentile(diff,97))
    cuts=[i for i in range(1,len(diff)) if diff[i]>thr and diff[i]>2.5*np.median(diff[max(0,i-10):i+10])]
    # merge cuts closer than 0.4 s
    merged=[]
    for c in cuts:
        if not merged or c-merged[-1]>4: merged.append(c)
    motion=float(np.median(diff))
    # dominant hue per second -> count distinct dominant hue families
    per_sec=[hue_hist(F[k*fps:(k+1)*fps]).argmax() for k in range(int(dur))]
    dominant=[int(x) for x in per_sec]
    from collections import Counter
    cnt=Counter(dominant)
    top_share=cnt.most_common(1)[0][1]/len(dominant)
    sat=np.mean([ (F[i].max(-1)-F[i].min(-1)).mean()/255 for i in range(0,len(F),10)])
    bright=np.mean(F)/255
    print(json.dumps({"video":name,"dur":round(dur,1),"cuts":len(merged),"avg_shot":round(dur/(len(merged)+1),2),"median_motion":round(motion,2),"hue_families_used":len(cnt),"top_hue_share":round(top_share,2),"mean_sat":round(float(sat),3),"mean_brightness":round(float(bright),3)}))
