
;==============================================================================================
;======================================< CUSTOM STATES >=========================================
;==============================================================================================

;========================< SHOCKED >=============================
[Statedef 7696]
type = U
physics = N
movetype = H
ctrl = 0
velset = 0, 0

[State 7696, sts]
type = statetypeset
trigger1 = !time
trigger1 = pos y < 0
statetype = A
[State 7696, sts]
type = statetypeset
trigger1 = !time
trigger1 = pos y >= 0
statetype = S

[State 7696, Pos]
type = posset
trigger1 = pos y >= 0
y = 0

[State 7696, Anim]
type = changeanim
trigger1 = !time
trigger1 = anim != 7696 && selfanimexist(7696)
value = 7696
[State 7696, Anim]
type = changeanim
trigger1 = !time
trigger1 = anim != 9010 && !selfanimexist(7696) && selfanimexist(9010)
value = 9010
[State 7696, Anim]
type = changeanim
trigger1 = !time
trigger1 = !selfanimexist(7696) && !selfanimexist(9010)
value = ifelse(statetype != A, 5002, 5030)

[State 7696, Var]
type = varset
trigger1 = !time
trigger1 = gethitvar(hitcount) <= 2
sysfvar(4) = 0
ignorehitpause = 1
[State 7696, Var]
type = varadd
trigger1 = !time
sysfvar(4) = 45
ignorehitpause = 1

[State 7696, nopalfx]
type = palfx
trigger1 = !time
trigger1 = (anim = 7696 || anim = 9010)
add = 0, 0, 0
time = 1

[State 7696, End]
type = changestate
trigger1 = alive && (anim = 7696 || anim = 9010) && hitshakeover
trigger2 = alive && (anim != 7696 && anim != 9010) && hitshakeover
value = ifelse(statetype = A, 1115020, 5300)
[State 7696, End]
type = selfstate
trigger1 = !alive && (anim != 7696 || anim != 9010) && hitshakeover
value = 5030


;========================< HIT by METSU HADOUKEN >=============================
[Statedef 1113045]
type = A
physics = N
movetype = H
ctrl = 0
velset = 0, 0

[State 1113045, Anim]
type = changeanim
trigger1 = 1
value = 5012
[State 1113045, Pos]
type = posset
trigger1 = pos y >= 0
y = 0

[State 1113045, Var]
type = varset
trigger1 = !time
trigger1 = gethitvar(hitcount) <= 2
sysfvar(4) = 0
ignorehitpause = 1
[State 1113045, Var]
type = varadd
trigger1 = !time
sysfvar(4) = 60
ignorehitpause = 1

[State 1113045, End]
type = changestate
trigger1 = alive && hitshakeover
value = 1115020
[State 1113045, End]
type = selfstate
trigger1 = !alive && hitshakeover
value = 5030


;========================< DIZZY >=============================
[Statedef 5300]
type = S
movetype = H
physics = S
velset = 0, 0
anim = 5300

[State 5300, Timer]
type = varadd
trigger1 = time
sysfvar(4) = -1
[State 5300, Timer]
type = varadd
trigger1 = sysfvar(4) > 0
trigger1 = command = "up" || command = "down" || command = "back" || command = "fwd"
sysfvar(4) = -2
[State 5300, Timer]
type = varadd
trigger1 = sysfvar(4) > 0
trigger1 = command = "x" || command = "y" || command = "z" || command = "a" || command = "b" || command = "c"
sysfvar(4) = -1

[State 5300, Skip]
type = varset
trigger1 = !time
sysfvar(3) = 0
[State 5300, Skip]
type = varadd
trigger1 = command = "up" || command = "down" || command = "back" || command = "fwd"
trigger2 = command = "a" || command = "b" || command = "c" || command = "x" || command = "y" || command = "z"
sysfvar(3) = 1

[State 5300, Skip]
type = changeanim
trigger1 = animelemtime(animelemno(0)) > 0 && animelemtime(animelemno(0) + 1) < 0
trigger1 = animelemtime(animelemno(0) + 1) >= -sysfvar(3)
value = 5300
elem = animelemno(0) + 1
[State 5300, Skip]
type = varset
trigger1 = animelemtime(1) >= 0 && !animelemtime(animelemno(0))
sysfvar(3) = 0

[State 5300, End]
type = varset
trigger1 = sysfvar(4) < 0
sysfvar(4) = 0
[State 5300, End]
type = selfstate
trigger1 = sysfvar(4) <= 0 || time >= 300 || roundstate != 2
value = 0
ctrl = 1


;========================< KICKED by EX JOUDAN S.G. >=============================
;--- Hit Pause ---
[Statedef 1111300]
type = A
movetype = H
physics = N
velset = 0, 0
[State 1111300, Anim]
type = changeanim
trigger1 = 1
value = 5002
[State 1111300, End]
type = changestate
trigger1 = hitshakeover
value = 1111301


;--- Falling ---
[Statedef 1111301]
type = A
movetype = H
physics = N

[State 1111301, Vel]
type = hitvelset
trigger1 = !time
x = 1
y = 1
[State 1111301, Accel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)

[State 1111301, screen]
type = screenbound
trigger1 = 1
value = 1
movecamera = 0, 1
[State 1111301, Push]
type = playerpush
trigger1 = 1
value = 0

[State 1111301, Anim]
type = changeanim
trigger1 = !time
value = 5030

[State 1111301, bounce]
type = changestate
trigger1 = backedgebodydist <= 10 || frontedgebodydist <= 10
value = 1111302
[State 1111301, End]
type = selfstate
trigger1 = vel y > 0 && pos y >= 0
value = 5100


;--- Hitting Wall ---
[Statedef 1111302]
type = A
movetype = H
physics = N

[State 1111302, turn]
type = turn
trigger1 = !time
trigger1 = frontedgedist < backedgedist

[State 1111302, Pos]
type = posset
trigger1 = 1
x = -160 * facing
[State 1111302, Pos]
type = posfreeze
trigger1 = 1
x = 1
y = 1

[State 1111302, screen]
type = screenbound
trigger1 = 1
value = 1
movecamera = 0, 1
[State 1111302, Push]
type = playerpush
trigger1 = 1
value = 1

[State 1111302, Anim]
type = changeanim
trigger1 = 1
value = 5000

[State 1111302, snd]
type = playsnd
trigger1 = !time
value = f7, 0
[State 1111302, FX]
type = explod
trigger1 = !time
anim = f72
pos = 0, floor(screenpos y) -50
postype = back
sprpriority = 3

[State 1111302, End]
type = changestate
trigger1 = time >= 4
value = 1111303


;--- Falling ---
[Statedef 1111303]
type = A
movetype = H
physics = N

[State 1111303, turn]
type = turn
trigger1 = !time

[State 1111303, Accel]
type = veladd
trigger1 = 1
y = 0.5
[State 1111303, Vel]
type = velset
trigger1 = !time
x = -2.5
y = -9

[State 1111303, Anim]
type = changeanim
trigger1 = !time
value = ifelse(selfanimexist(5051), 5051, 5030)
[State 1111303, Anim]
type = changeanim
trigger1 = anim = 5030 && !animtime
value = 5050
[State 1111303, Anim]
type = changeanim
trigger1 = vel y > -3 && anim = 5051
value = 5061

[State 1111303, screen]
type = screenbound
trigger1 = 1
value = 1
movecamera = 0, 0
[State 1111303, Push]
type = playerpush
trigger1 = 1
value = 0

[State 1111303, Recover]
type = selfstate
trigger1 = alive
trigger1 = command = "recovery"
trigger1 = vel y > 0 && pos y >= const(movement.air.gethit.groundrecover.ground.threshold)
value = 5200

[State 1111303, End]
type = selfstate
trigger1 = vel y > 0 && pos y >= 0
value = 5100

;========================< GROUND BOUNCE FROM RYUSOKYAKU>=====================
;Being Slammed
[StateDef 1111500]
type = A
moveType = H
physics = N
velset = 0,0

[State 1111500, ChangeAnim]
type = ChangeAnim
trigger1 = 1
value = ifElse(SelfAnimExist(5980) && enemyNear, AuthorName != "Warusaki3", 5980, 5012)

;[State 1111500, End]
;type = SelfState
;trigger1 = HitShakeOver && pos y < 0
;value = 5030

[State 1111500, End]
type = ChangeState
trigger1 = HitShakeOver ;&& pos y >= 0
value = 1111501


;Hitting the Ground
[StateDef 1111501]
type = L
moveType = H
physics = N
velSet = 0,0

[State 1111501, ChangeAnim]
type = ChangeAnim
trigger1 = !Time
value = 5100

[State 1111501, Pos]
type = PosSet
trigger1 = 1
y = 0

[State 1111501, EnvShake]
type = EnvShake
trigger1 = !Time
time = 14
ampl = -4

[State 1111501, Impact Sound]
type = PlaySnd
trigger1 = !Time
value = F7,1

[State 1111501, End]
type = ChangeState
trigger1 = !AnimTime
value = 1111502


;Bouncing Off Ground
[StateDef 1111502]
type = L
moveType = H
physics = N

[State 1111502, ChangeAnim]
type = ChangeAnim
trigger1 = !Time
value = 5160

[State 1111502, PosSet]
type = PosSet
trigger1 = !Time
y = 0

[State 1111502, VelSet]
type = VelSet
trigger1 = !Time
y = -2.4

[State 1111502, VelAdd]
type = VelAdd
trigger1 = 1
y = 0.6

[State 1111502, End]
type = SelfState
trigger1 = vel y > 0
trigger1 = pos y >= 12
value = 5110

;========================< HIT BACK, then dizzy >=============================
[Statedef 1115020]
type = A
movetype = H
physics = N
velset = 0, 0
[State 1115020, Anim]
type = changeanim
trigger1 = 1
value = 5030
[State 1115020, End]
type = changestate
trigger1 = hitshakeover
value = 1115030
[State 5120, 4]
type = HitFallSet
trigger1 = AnimTime = 0
value = 0

[Statedef 1115030]
type = A
movetype = H
physics = N
ctrl = 0
[State 1115030, Accel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)
[State 1115030, Vel]
type = hitvelset
trigger1 = !time
x = 1
y = 1
[State 1115030, End]
type = changestate
trigger1 = hitover
trigger2 = vel y > 0 && pos y >= 10
value = 1115050
[State 1115030, End]
type = changestate
trigger1 = !animtime
value = 1115035

[Statedef 1115035]
type = A
movetype = H
physics = N
[State 1115035, Anim]
type = changeanim
trigger1 = !time && selfanimexist(5035)
value = 5035
[State 1115035, Accel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)
[State 1115035, End]
type = changestate
trigger1 = hitover
trigger2 = !animtime
trigger3 = vel y > 0 && pos y >= 10
trigger4 = !time && anim != 5035
value = 1115050

[Statedef 1115050]
type = A
movetype = H
physics = N
[State 1115050, Anim]
type = changeanim
trigger1 = anim = 5035 && !animtime
trigger2 = anim != 5035 && !time
value = 5050
[State 1115050, Anim]
type = changeanim
trigger1 = anim = [5050, 5059]
trigger1 = vel y >= ifelse(anim = 5050, 1, -2)
trigger1 = selfanimexist(anim + 10)
value = anim + 10
persistent = 0
[State 1115050, Accel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)
[State 1115050, End]
type = changestate
trigger1 = vel y > 0
trigger1 = pos y >= ifelse((anim = [5051, 5059]) || (anim = [5061, 5069]), 0, 25)
value = 1115100

[Statedef 1115100]
type = L
movetype = H
physics = N
[State 1115100, 1]
type = velset
trigger1 = !time && gethitvar(fall.yvel) = 0 && vel x > 1
x = 1
[State 1115100, Shake]
type = fallenvshake
trigger1 = !time
[State 1115100, Var]
type = varset
trigger1 = !time
sysvar(1) = floor(vel y)
[State 1115100, Anim]
type = ChangeAnim
trigger1 = !time
value = 5100
[State 1115100, Pos]
type = posset
trigger1 = !time
y = 0
[State 1115100, Vel]
type = velset
trigger1 = !time
y = 0
[State 1115100, Vel]
type = velmul
trigger1 = !time
x = 0.75
[State 1115100, End]
type = changestate
trigger1 = !time
trigger1 = gethitvar(fall.yvel) = 0
value = 1115110
[State 1115100, FX]
type = gamemakeanim
trigger1 = time = 1
value = 60 + (sysvar(1) > 5) + (sysvar(1) > 14)
pos = 0, 0
under = sysvar(1) <= 14
[State 1115100, hurt]
type = hitfalldamage
trigger1 = time = 3
[State 1115100, snd]
type = playsnd
trigger1 = Time = 1
value = F7, (sysvar(1) > 5) + (sysvar(1) > 14)
[State 1115100, freeze]
type = posfreeze
trigger1 = 1
[State 1115100, End]
type = changestate
trigger1 = !animtime
value = 1115101

[Statedef 1115101]
type = L
movetype = H
physics = N
[State 1115101, Anim]
type = changeanim
trigger1 = !time
value = 5160
[State 1115101, Vel]
type = hitfallvel
trigger1 = !time
[State 1115101, Pos]
type = posset
trigger1 = !time
y = 20
[State 1115101, accel]
type = veladd
trigger1 = 1
y = 0.4
[State 1115101, End]
type = changestate
trigger1 = vel y > 0 && pos y >= 12
value = 1115110

[Statedef 1115110]
type = L
movetype = H
physics = N
[State 1115110, Shake]
type = fallenvshake
trigger1 = !time

[State 1115110, 2]
type = changeanim
trigger1 = !time
value = 5170
[State 1115110, hurt]
type = hitfalldamage
trigger1 = !time
[State 1115110, Pos]
type = posset
trigger1 = !time
y = 0
[State 1115110, Var]
type = varset
trigger1 = !time
trigger1 = gethitvar(fall.yvel) != 0
sysvar(1) = floor(vel y)
[State 1115110, snd]
type = playsnd
trigger1 = !time && !sysvar(0)
value = F7, (sysvar(1) > 5) + (sysvar(1) > 14)
[State 1115110, FX]
type = gamemakeanim
trigger1 = !time && !sysvar(0)
value = 60 + (sysvar(1) > 5) + (sysvar(1) > 14)
pos = 0, 0
under = sysvar(1) <= 14
[State 1115110, Vel]
type = velset
trigger1 = !time
y = 0
[State 1115110, Anim]
type = changeanim
persistent = 0
triggerall = anim != [5111, 5119]
trigger1 = !animtime
trigger2 = sysvar(0)
value = 5110

[State 1115110, ko]
type = selfstate
triggerall = !alive
trigger1 = !animtime
trigger2 = sysvar(0)
trigger3 = anim = [5110, 5119]
value = 5150
[State 1115110, Var]
type = varset
trigger1 = sysvar(0)
trigger1 = !time
sysvar(0) = 0
[State 1115110, Vel]
type = velmul
trigger1 = 1
x = 0.85
[State 1115110, getup]
type = changestate
trigger1 = alive && time >= 9;const(data.liedown.time)
value = 1115120
persistent = 0

[Statedef 1115120]
type = L
movetype = H
physics = N
[State 1115120, Anim]
type = changeanim
trigger1 = !time
value = 5120
[State 1115120, Vel]
type = velset
trigger1 = !time
x = 0
[State 1115120, NHB]
type = nothitby
trigger1 = 1
value = SCA
time = 1
[State 1115120, hitfall]
type = hitfallset
trigger1 = !animtime
value = 1
[State 1115120, NHB]
type = nothitby
trigger1 = 1
value = SCA
time = 1
[State 1115120, dizzy]
type = changestate
trigger1 = !animtime
value = 5300

; Opponent thrown into the air
[Statedef 1066]
type    = A
movetype= H
physics = N
velset = -5,-6
poweradd = 40

[State 0, PalFX]
type = PalFX
trigger1 = !time
time = IfElse(prevstateno = (3006||3021),27,24)
add = 0,0,20
mul = 160,0,230
sinadd = 40,0,40,10
invertall = 1
color = 0
ignorehitpause = 1

[State 0, ChangeAnim]
type = ChangeAnim
trigger1 = !Time
value = 5050

[State 0, ChangeAnim]
type = ChangeAnim
trigger1 = anim = [5050,5059]
trigger1 = Vel Y >= ifelse(anim = 5050, 1, -2)
trigger1 = SelfAnimExist(anim+10)
value = anim+10
persistent = 0

[State 0, Gravity]
type = Gravity
trigger1 = 1

[State 821, SelfState]
type = SelfState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 5100
;========================<HIT WALL>=============================
;---Hit Pause---
[Statedef 1125]
type=A
movetype=H
physics=N
velset=0,0
[State 1125, anim]
type=changeanim
trigger1= 1
value=5012
[State 1125, end]
type=changestate
trigger1= hitshakeover
value=1126


;---Falling---
[Statedef 1126]
type=A
movetype=H
physics=N

[State 1126, vel]
type=hitvelset
trigger1= !time
x=1
y=1
[State 1126, grav]
type=veladd
trigger1= 1
y=gethitvar(yaccel)

[State 1126, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,1
[State 1126, push]
type=playerpush
trigger1= 1
value=0

[State 1126, anim]
type=changeanim
trigger1= !time
value=5030

[State 1126, bounce]
type=changestate
trigger1= backedgebodydist<=10 || frontedgebodydist<=10
value=1127
[State 1126, end]
type=selfstate
trigger1= vel y>0 && pos y>=0
value=5100


;---Hitting Wall---
[Statedef 1127]
type=A
movetype=H
physics=N

[State 1127, turn]
type=turn
trigger1= !time
trigger1= frontedgedist<backedgedist


[State 1127, pos]
type=posset
trigger1= 1
x=-160*facing
[State 1127, pos]
type=posfreeze
trigger1= 1
x=1
y=1

[State 1127, EnvShake]
type = EnvShake
trigger1 = !time
time =14
ampl = 6
ignorehitpause =1

[State 1127, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,1
[State 1127, push]
type=playerpush
trigger1= 1
value=1

[State 1127, anim]
type=changeanim
trigger1= 1
value=5000

[State 1127, end]
type=changestate
trigger1= time>=4
value=1128


;---Falling---
[Statedef 1128]
type=A
movetype=H
physics=N

[State 1128, turn]
type=turn
trigger1= !time

[State 1128, grav]
type=veladd
trigger1= 1
y=.5
[State 1128, vel]
type=velset
trigger1= !time
x=-2.5
y=-9

[State 1128, anim]
type=changeanim
trigger1= !time
value=ifelse(selfanimexist(5051),5051,5030)
[State 1128, anim]
type=changeanim
trigger1= anim=5030 && !animtime
value=5050
[State 1128, Anim]
type=changeanim
trigger1= vel y>-3 && anim=5051 &&selfanimexist(5061)
value=5061
[State 1128, Anim]
type=changeanim
trigger1= vel y>-3 && anim=5051 &&!selfanimexist(5061)&&selfanimexist(5060)
value=5060
[State 1128, Anim]
type=changeanim
trigger1= vel y>-3 && anim=5051&&!selfanimexist(5060) &&!selfanimexist(5061)&&selfanimexist(5062)
value=5062
[State 1128, Anim]
type=changeanim2
trigger1= vel y>-3 && anim=5051&&!selfanimexist(5060) &&!selfanimexist(5061)&&!selfanimexist(5062)
value=5061

[State 1128, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,0
[State 1128, push]
type=playerpush
trigger1= 1
value=0

[State 1128, end]
type=selfstate
trigger1= vel y>0 && pos y>=0
value=5100
;---------------------------------------------------------------------------
[Statedef 1215]
type    = A
movetype= H
physics = N
ctrl = 0

[State 0, veladd]
type = VelAdd
trigger1 = 1
y = GetHitVar(yaccel)

[State 0, hitvelset]
type = HitVelSet
trigger1 = Time = 0
x = 1
y = 1
[State 0,Bound]
type = ScreenBound
trigger1 = 1
value = 1
movecamera = 1,0
[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 1215  ;<=======custom animation

[State 0, ChangeState]
type = SelfState
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 5100
ctrl = 0
;-------------------------------------------------------------------------
[Statedef 1330]
type = A
movetype = H
physics = N
velset = 0, 0
sprpriority = 2

[State 1330, Push
type = playerpush
trigger1 = 1
value = 0
[State 1330, Freeze]
type = posfreeze
trigger1 = 1
value = 1

[State 1330, Anim]
type = changeanim
trigger1 = 1
value = anim
elem = animelemno(0)

[State 1330, End]
type = selfstate
trigger1 = time >= 32
value = 5040
;-------------------------------------------------------------------------
[Statedef 1440]
type = A
movetype = H
physics = N
velset = 0, 0
sprpriority = 1

[State 1440, Anim]
type = changeanim2
trigger1 =!time
value = 1440
[State 1440, HitFallSet]
type = HitFallSet
trigger1 =1
value = 0
ignorehitpause =1
[State 1440, PosSet]
type = PosSet
trigger1 =1
y = 0
;-------------------------------------------------------------------------
[Statedef 1441]
type = S
movetype = H
physics = N
velset = 0, 0
sprpriority = 2

[State 1441, Anim]
type = changeanim2
trigger1 =!time
value = 1441
[State 1440, PosSet]
type = PosSet
trigger1 =1
y = 0
;-------------------------------------------------------------------------
[Statedef 1442]
type = L
movetype = H
physics = N
velset = 0, 0
sprpriority = 2

[State 1442, Anim]
type = changeanim2
trigger1 =!time
value = 1442
[State 0, SelfState]
type = SelfState
trigger1 = time>=60
value =Ifelse(Alive,5120,5150)
;---------------------------------------------------------------------------
;Off wall Knockback
[Statedef 3007]
type    = A
movetype= H
physics = N
ctrl = 0
velset=-15,-3
facep2 = 1

[State 3007, VA]
type = VelAdd
trigger1 =1
y =.4

[State 3007, anim]
type=changeanim
trigger1= 1
value=5012

[State 3007, ChangeState]
type = changeState
trigger1= hitshakeover
value = 3008
;---------------------------------------------------------------------------
[Statedef 3220]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0
[State 0, PosSet]
type = PosSet
trigger1 = !time
y = 0
[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 0,1
ignorehitpause =1

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3220  ;<=======custom animation
[State 0, ChangeState]
type = ChangeState
trigger1 = p2stateno!=3201
value = 3222
[State 0, SelfState]
type = SelfState
trigger1 = animtime=0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3221]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset=-8,-4
poweradd = 0
sprpriority = 1
facep2 = 1

[State 0, Posadd]
type = Posadd
trigger1 =!time
y = -20

[State 0, VA]
type = VelAdd
trigger1 =1
y =.45

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3221  ;<=======custom animation

[State 0, ChangeState]
type = SelfState
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 5100
ctrl = 0
;---------------------------------------------------------------------------
[Statedef 3222]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3222  ;<=======custom animation
[State 0, SelfState]
type = SelfState
trigger1 = time>=40
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3235]
type    = A
movetype= H
physics = N
ctrl = 0
velset = 0,0
sprpriority = 1

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3235  ;<=======custom animation
;---------------------------------------------------------------------------
[Statedef 3236]
type    = A
movetype= H
physics = N
velset = 0,0

[State 3236, HitGround]
type = PosSet
trigger1 = !Time
y = 0
[State 3236, ChangeAnim2]
type = ChangeAnim2
trigger1 = !Time
value = 3236
[State 3236, VelSet]
type = VelSet
trigger1 =AnimElemNo(0) = 2
x = 1
y =-7
[State 3236, vel]
type = VelAdd
Trigger1 =AnimElemNo(0) >= 2
y = .4

[State 3236, fall]
type = SelfState
trigger1 = animelemtime(3)>=0
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 5100
;---------------------------------------------------------------------------
[Statedef 3237]
type    = A
movetype= H
physics = N
facep2 = 1
velset = -14,-2

[State 0, PosSet]
type = PosSet
trigger1 =!time
y = -30

[State 3237, ChangeAnim2]
type = ChangeAnim2
trigger1 = !Time
value = 3237
[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 0,1
ignorehitpause =1

[State 3237, vel]
type = VelAdd
Trigger1 =1
y = .35
[State 3237, bounce]
type=changestate
trigger1= backedgebodydist<=10 || frontedgebodydist<=10
value=1127
[State 3237, fall]
type = SelfState
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 5100
;---------------------------------------------------------------------------
[Statedef 3270]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0
[State 0, PosSet]
type = PosSet
trigger1 = !time
y = 0

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3220  ;<=======custom animation
[State 0, ChangeState]
type = ChangeState
trigger1 = p2stateno!=3251
value = 3222
[State 0, SelfState]
type = SelfState
trigger1 = animtime=0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3271]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0

[State 0, HitBy]
type = HitBy
trigger1 =1
value = SCA,HA

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3222  ;<=======custom animation
[State 0, SelfState]
type = SelfState
trigger1 = time>=60
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3285]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0
facep2 = 1

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0

[State 0, PosSet]
type = PosSet
trigger1 = !time
y = 0
[State 0, HitBy]
type = HitBy
trigger1 =1
value = S,HA
time = 1
ignorehitpause =1

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3285  ;<=======custom animation

[State 0, SelfState]
type = SelfState
trigger1 = animtime=0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3286]
type    = S
movetype= H
physics = S
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0
facep2 = 1

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0
[State 0, PosSet]
type = PosSet
trigger1 = !time
y = 0
[State 0, HitBy]
type = HitBy
trigger1 =1
value = S,HA
time = 1
ignorehitpause =1

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3286  ;<=======custom animation
[State 0, SelfState]
type = SelfState
trigger1 = animtime=0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 3420]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority =1

[State 3420, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3420
[State 3420, AngleDraw]
type = AngleDraw
trigger1 =(teammode!=simul)&&(enemy,teammode!=simul)
value = -35
scale =1.1,1.1
ignorehitpause =1
[State 3420, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 1,0
ignorehitpause =1

[State 0, PalFXWiz]
type = PalFX
trigger1 =!time
time = 8
add = 100,100,100
mul = 256,256,256
sinadd = -80,-80,-80,4
invertall = 0
color = 255
ignorehitpause = 1

[State 0, VelSet]
type = VelSet
trigger1 =time=30
y =-3
[State 0, VelSet]
type = Veladd
trigger1 =time>=50
y =.4
;---------------------------------------------------------------------------
[Statedef 3421]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority =1

[State 0, PalFXWiz]
type = PalFX
trigger1 =timemod=20,0
time = 8
add = 100,100,100
mul = 256,256,256
sinadd = -80,-80,-80,4
invertall = 0
color = 255
ignorehitpause = 1

[State 3421, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3421
[State 3421, AngleDraw]
type = AngleDraw
trigger1 =(teammode!=simul)&&(enemy,teammode!=simul)
value = 0
scale =1.2,1.2
ignorehitpause =1
[State 3421, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 1,0
ignorehitpause =1

;---------------------------------------------------------------------------
[Statedef 3422]
type    = A
movetype= H
physics = N
velset=0,0
ctrl = 0
[State 0, PalFXWiz]
type = PalFX
trigger1 =timemod=20,0
time = 8
add = 100,100,100
mul = 256,256,256
sinadd = -80,-80,-80,4
invertall = 0
color = 255
ignorehitpause = 1
[State 3422, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 3422
[State 3421, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 1,0
ignorehitpause =1
;---------------------------------------------------------------------------
[Statedef 3423]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1
[State 0, PalFXWiz]
type = PalFX
trigger1 =timemod=20,0
time = 8
add = 100,100,100
mul = 256,256,256
sinadd = -80,-80,-80,4
invertall = 0
color = 255
ignorehitpause = 1
[State 3423, anim]
type=changeanim2
trigger1= !time
value=3423
[State 3423, AngleDraw]
type = AngleDraw
trigger1 =(teammode!=simul)&&(enemy,teammode!=simul)
value = 0
scale =1.35,1.35
ignorehitpause =1
[State 3423, ScreenBound]
type = ScreenBound
trigger1 =(teammode!=simul)&&(enemy,teammode!=simul)
value = 1
movecamera = 1,0
ignorehitpause =1
;---------------------------------------------------------------------------
[Statedef 3424]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1
[State 0, PalFXWiz]
type = PalFX
trigger1 =timemod=20,0
time = 8
add = 100,100,100
mul = 256,256,256
sinadd = -80,-80,-80,4
invertall = 0
color = 255
ignorehitpause = 1
[State 3424, anim]
type=changeanim2
trigger1= !time
value=3424
[State 3424, VelSet]
type = VelSet
trigger1=!time
x = -2
y = -12
[State 3424, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 1,0
ignorehitpause =1
[State 3424, VelAdd]
type = VelAdd
Trigger1 =1
y = .45

[State 3424, SelfState]
type = SelfState
trigger1 = Pos Y >= 0&&Vel Y > 0
value = 5100

;------------------------------------------------------------------------
[Statedef 3520]
type = A
movetype = H
physics = N
velset = 0, 0
sprpriority = 2

[State 3520, NHB]
type = hitby
trigger1 = 1
value = SCA,HA
time = 1
[State 3520, Push
type = playerpush
trigger1 = 1
value = 0
[State 3520, Freeze]
type = posfreeze
trigger1 = 1
value = 1

[State 3520, Anim]
type = changeanim
trigger1 = 1
value = anim
elem = animelemno(0)

[State 3520, End]
type = selfstate
trigger1 = time >= 60
value = 5040
;-----------------------------------------------------------------
[Statedef 3521]
type=S
physics=S
movetype=H
ctrl=0
velset=gethitvar(xvel),0
sprpriority=1

[State 3521, nhb]
type=nothitby
trigger1= 1
time=1
value=SCA

[State 3521, anim]
type=changeanim
trigger1= !time && selfanimexist(5950)
value=5950
[State 3521, anim]
type=changeanim2
trigger1= !time && !selfanimexist(5950)
value=3521

[State 3521, stop]
type=posset
trigger1= 1
y=0
[State 3521, stop]
type=velset
trigger1= 1
y=0
[State 3521, dust]
type=gamemakeanim
trigger1= anim=3521 && animelem=7
value=60
pos=0,0
under=sysvar(1)<=14
[State 3521, snd]
type=playsnd
trigger1= anim=3521 && animelem=7
value=f7,0
[State 3521, Width]
type = Width
trigger1 =1
edge = 0,35
ignorehitpause =1

[State 3521, anim]
type=changeanim
trigger1= time>=110 && selfanimexist(5111)
value=5111
[State 3521, end]
type=selfstate
trigger1= time>=110
value=ifelse(alive,5120,5150)
;------------------------------------------------------------------------
[Statedef 3522]
type=A
physics=N
movetype=H
ctrl=0
velset=gethitvar(xvel),gethitvar(yvel)
sprpriority=1

[State 3522, nhb]
type=nothitby
trigger1= 1
time=1
value=SCA

[State 3522, anim]
type=changeanim2
trigger1= !time
value=3522

[State 3522, grav]
type=gravity
trigger1= animelemtime(5)<0
[State 3522, stop]
type=posset
trigger1= pos y>=0
y=0
[State 3522, stop]
type=velset
trigger1= pos y>=0
y=0
[State 3522, sts]
type=statetypeset
trigger1= pos y>=0
type=L
physics=C

[State 3522, anim]
type=changeanim2
trigger1= pos y>=0
value=3522
elem=5
persistent=0
[State 3522, dust]
type=gamemakeanim
trigger1= animelem=5
value=62
pos=0,0
under=sysvar(1)<=14
[State 3522, snd]
type=playsnd
trigger1= animelem=5
value=f7,2
[State 3522, Width]
type = Width
trigger1 =1
edge = 20,35
ignorehitpause =1
[State 3522, end]
type=selfstate
trigger1= animelemtime(7)>=110
value=ifelse(alive,5120,5150)
;---------------------------------------------------------------------------
;Off screen Knockback
[Statedef 4020]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset=-15,-3
poweradd = 0
sprpriority = 1
facep2 = 1

[State 0, VA]
type = VelAdd
trigger1 =animelemtime(6)>=0
y =.45

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = !time
value = 4020  ;<=======custom animation

[State 0, ChangeState]
type = changeState
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 4021
ctrl = 0
;---------------------------------------------------------------------------
[Statedef 4021]
type    = L
movetype= H
physics = N
velset = 0,0
facep2=1

[State 4021, HitGround]
type = PosSet
trigger1 = 1
y = 0
[State 4021, 2]
type = GameMakeAnim
trigger1 = Time = 0
trigger1 = !SysVar(0)
value = 60 + (sysvar(1) > 5) + (sysvar(1) > 14)
pos = 0, 0
under = sysvar(1) <= 14
[State 4021, EnvShake]
type = EnvShake
trigger1 =time=0
time=18
ampl=6
[State 4021, BounceGround]
type = ChangeAnim2
trigger1 = !Time
value = 4021

[State 4021, finish]
type = SelfState
trigger1 = time>=100
value = Ifelse(Alive,5120,5150)
;---------------------------------------------------------------------------
[Statedef 4043]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0
facep2 = 1

[State 0, VelSet]
type = VelSet
trigger1 =animelem=3,=10
x = 0
y = -4
[State 0, AngleDraw]
type = AngleDraw
trigger1 =animelemtime(4)<0
scale =1.25,1.25
ignorehitpause =1
[State 4043, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4043, anim]
type=changeanim2
trigger1= !time
value=4043
[State 0, HitBy]
type = HitBy
trigger1 =1
value = A,HA
ignorehitpause =1

[State 4043, VelAdd]
type = Veladd
trigger1=animelemtime(6)>=0
y = .5
[State 4043, SelfState]
type = SelfState
trigger1=Pos Y >= 0 && Vel Y > 0
value = 5100
[Statedef 4044]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,-3
poweradd = 0
sprpriority = 0
facep2 = 1

[State 4044, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4044, anim]
type=changeanim2
trigger1= !time
value=4046
[State 0, HitBy]
type = HitBy
trigger1 =1
value = A,HA
ignorehitpause =1

[State 4044, VelAdd]
type = Veladd
trigger1=animelemtime(4)>=0
y = .5
[State 4044, SelfState]
type = SelfState
trigger1=Pos Y >= 0 && Vel Y > 0
value = 5100
;---------------------------------------------------------------------------
[Statedef 4045]
type    = S
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 0
facep2 = 1

[State 0, HitFallSet]
type = HitFallSet
trigger1 = 1
value = 0

[State 0, PosSet]
type = PosSet
trigger1 = !time
y = 0
[State 4045, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4045, anim]
type=changeanim2
trigger1= !time
value=4045
[State 0, HitBy]
type = HitBy
trigger1 =1
value = C,HA
ignorehitpause =1

[State 4045, SelfState]
type = SelfState
trigger1=!animtime
value = 0
ctrl=1
;---------------------------------------------------------------------------
[Statedef 4046]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,-3
poweradd = 0
sprpriority = 0
facep2 = 1

[State 4046, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4046, anim]
type=changeanim2
trigger1= !time
value=4046
[State 0, HitBy]
type = HitBy
trigger1 =1
value = C,HA
ignorehitpause =1

[State 4046, VelAdd]
type = Veladd
trigger1=animelemtime(4)>=0
y = .5
[State 4046, SelfState]
type = SelfState
trigger1=Pos Y >= 0 && Vel Y > 0
value = 5100

;---------------------------------------------------------------------------
[Statedef 4047]
type    = A
movetype= H
physics = N
juggle = 1
ctrl = 0
velset = 0,-3.5
poweradd = 0
sprpriority = 0
facep2 = 1

[State 4047, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4047, anim]
type=changeanim2
trigger1= !time
value=4047

;---------------------------------------------------------------------------
[Statedef 4048]
type    = A
movetype= H
physics = N
ctrl = 0
velset = 0,0
poweradd = 0
sprpriority = 2

[State 0, PosSet]
type = PosSet
trigger1 =!time
y = 200
ignorehitpause =1
[State 4048, screen]
type=screenbound
trigger1= 1
value=1
movecamera=1,0
[State 4048, Velset]
type = Velset
trigger1=time>=60
y = -3.5
[State 4048, VelAdd]
type = Veladd
trigger1=time>=160
y = .2
[State 4048, anim]
type=changeanim2
trigger1= !time
value=4048

;---------------------------------------------------------------------------
;Wall-knockdown
[Statedef 4060]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1

[State 4061, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,1
[State 4060, anim]
type=changeanim
trigger1= !time&&selfanimexist(5035)
value=5035
[State 4060, anim]
type=changeanim
trigger1= !time&&!selfanimexist(5035)&&selfanimexist(5030)
value=5030
[State 4060, anim]
type=changeanim2
trigger1= !time&&!selfanimexist(5035)&&!selfanimexist(5030)
value=4020
[State 4060, Turn]
type = Turn
trigger1 = Time = 0
trigger1 = P2Dist X < 0

[State 4060, VelSet]
type = VelSet
trigger1 = !time
x = -8
y = Ifelse(BackEdgeBodyDist<=35,-8,-4)

[State 4060, ChangeState]
type = ChangeState
triggerall = AnimElem = 1, > 0
trigger1 = BackEdgeBodyDist <= 5
trigger2 = Time >= 60
value = 4061
;---------------------------------------------------------------------------
[Statedef 4061]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1

[State 4061, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,1
[State 4061, push]
type=playerpush
trigger1= 1
value=1
[State 4061, pos]
type=posset
trigger1= 1
x=-160*facing
[State 4061, pos]
type=posfreeze
trigger1= 1
x=1
y=1

[State 4061, Anim]
type=changeanim
trigger1= !time&&selfanimexist(5051)
value=5051
[State 4061, Anim]
type=changeanim
trigger1= !time&&!selfanimexist(5051)&&selfanimexist(5050)
value=5050
[State 4060, anim]
type=changeanim2
trigger1= !time&&!selfanimexist(5051)&&!selfanimexist(5050)
value=4020
elem=3
[State 4061, EnvShake]
type = EnvShake
trigger1 = !Time
time = 14
ampl = 6

[State 4061, ChangeState]
type = ChangeState
trigger1=time=10
value = 4062
;---------------------------------------------------------------------------
[Statedef 4062]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1

[State 0, Turn]
type = Turn
trigger1 =!time
[State 4062, screen]
type=screenbound
trigger1= 1
value=1
movecamera=0,1
[State 4062, Anim]
type=changeanim
trigger1= !time&&selfanimexist(5061)
value=5061
[State 4062, Anim]
type=changeanim
trigger1= !time&&!selfanimexist(5061)&&selfanimexist(5062)
value=5062
[State 4062, Anim]
type=changeanim
trigger1= !time&&!selfanimexist(5061)&&!selfanimexist(5062)&&selfanimexist(5070)
value=5070
[State 4062, Anim]
type=changeanim
trigger1= !time&&!selfanimexist(5061)&&!selfanimexist(5062)&&!selfanimexist(5070)&&selfanimexist(5050)
value=5050
[State 4060, anim]
type=changeanim2
trigger1= !time&&!selfanimexist(5061)&&!selfanimexist(5062)&&!selfanimexist(5070)&&!selfanimexist(5050)
value=4020
elem=4
[State 4062, VelSet]
type = VelSet
trigger1 = AnimElem = 2
x = -2
y = -2

[State 4062, VelAdd]
type = VelAdd
Trigger1 = 1
y = .45

[State 4062, SelfState]
type = SelfState
trigger1 = Pos Y >= 0&&Vel Y > 0
value = 5100
;---------------------------------------------------------------------------
;Custom-ceiling bounce
[Statedef 4065]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 1
facep2=1

[State 4065, anim2]
type=changeanim2
trigger1= !time
value=4065
[State 4065, VelSet]
type = VelSet
trigger1 =!time
x = -6
y = -10

[State 4065, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
movecamera = 1,0

[State 4060, ChangeState]
type = ChangeState
trigger1 = ceil(pos y<=-145)
trigger2 = Time=50
value = 4066


;---------------------• ‚É‹ò‚ç‚¤‚Q‚o
[Statedef 3060]
type    = S
movetype= H
physics = N
velset = 0,0

[State 3060, 1]
type = PosSet
trigger1 = 1
y = 0

[State 3060, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 3060, nothitby]
type = notHitBy
trigger1 = 1
value = C,HA

[State 3060, p2]
type = ChangeAnim2
Trigger1 = Time = 0
value = 3060

[State 3060, end]
type = selfstate
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------Šç–Ê‚É‹ò‚ç‚¤‚Q‚o
[Statedef 3065]
type    = S
movetype= H
physics = N
velset = 0,0

[State 3065, 1]
type = PosSet
trigger1 = 1
y = 0

[State 3065, nothitby]
type = notHitBy
trigger1 = 1
value = C,HA

[State 3065, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 3065, p2]
type = ChangeAnim2
Trigger1 = Time = 0
value = 3065

[State 3065, end]
type = selfstate
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------R‚è‚ð‹ò‚ç‚¤‚Q‚o
[Statedef 3070]
type    = S
movetype= H
physics = N
velset = 0,0

[State 3070, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 3070, nothitby]
type = notHitBy
trigger1 = 1
value = C,HA

[State 3070, 1]
type = PosSet
trigger1 = 1
y = 0

[State 3070, p2]
type = ChangeAnim2
Trigger1 = Time = 0
value = 3070

;---------------------‚Ô‚Á“|‚ê‚é‚Q‚o
[Statedef 3075]
type    = S
movetype= H
physics = N
velset = 0,0

[State 3075, 1]
type = PosSet
trigger1 = 1
y = 0

[State 3075, 2]
type = HitBy
trigger1 = time = 0
value = A,HP

[State 3075, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 3075, p2]
type = ChangeAnim2
Trigger1 = Time = 0
value = 3075

[State 3075, 1]
type = ChangeAnim
trigger1 = Time = 570 && alive
value = 5120
ctrl = 0

[State 3075, 6]
type = SelfState
trigger1 = Time = 570 && alive
value = 0
ctrl = 1

[State 3075, dead]
type = SelfState
trigger1 = Time = 570 && !alive
value = 5150
ctrl = 0
