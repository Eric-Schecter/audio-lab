"""Procedural audition samples; these are not outputs of an AI audio model."""
import math, random, struct, wave
from pathlib import Path
random.seed(12)
SR=22050
out=Path(__file__).resolve().parents[1]/'public/audio'
def save(name,seconds,fn):
 with wave.open(str(out/name),'wb') as w:
  w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
  w.writeframes(b''.join(struct.pack('<h',int(max(-.95,min(.95,fn(i/SR)))*32767)) for i in range(seconds*SR)))
chords=[[146.832,184.997,220,293.665],[130.813,164.814,196,261.626],[97.999,123.471,146.832,195.998],[110,138.591,164.814,220]]
notes=[293.665,369.994,440,369.994,261.626,329.628,392,329.628,293.665,246.942,195.998,246.942,220,277.183,329.628,277.183]
def music(t):
 phase=t%8; env=min(phase/.7,1)*min((8-phase)/.9,1)
 pad=sum(math.sin(2*math.pi*f*t)*(.8+.2*math.sin(2*math.pi*.125*t)) for f in chords[int(t//8)%4])/4
 age=t%2; f=notes[int(t//2)%16]
 pluck=(math.sin(2*math.pi*f*t)+.2*math.sin(2*math.pi*f*2*t))*min(age/.025,1)*math.exp(-age*2)
 return (.24*pad*env+.14*pluck)*min(t/2,1)*min((64-t)/2,1)
save('voyage.wav',64,music)
# Periodic noise beds allow exact repeat boundaries without random transient seams.
def bed(kind):
 bands=[(random.uniform(50,1200),random.random()*math.tau,random.uniform(.3,1)) for _ in range(70)]
 # Snap frequencies to the 24-second period.
 bands=[(round(f*24)/24,p,a) for f,p,a in bands]
 def fn(t):
  noise=sum(math.sin(math.tau*f*t+p)*a for f,p,a in bands)/18
  if kind=='water': return noise*(.36+.12*math.sin(math.tau*t/6))+.07*math.sin(math.tau*round(83*24)/24*t)*(.5+.5*math.sin(math.tau*t/8))
  return noise*(.2+.12*math.sin(math.tau*t/12))+.018*math.sin(math.tau*340*t)*(.5+.5*math.sin(math.tau*t/8))
 return fn
save('bow-water.wav',24,bed('water'))
save('wind-sails.wav',24,bed('wind'))
def wood(t):
 phase=t%8; envelope=math.exp(-((phase-2)/.5)**2)+.6*math.exp(-((phase-5)/.3)**2)
 return .13*envelope*(math.sin(math.tau*180*t+6*math.sin(math.tau*t/8))+.35*math.sin(math.tau*390*t))
save('hull.wav',24,wood)
