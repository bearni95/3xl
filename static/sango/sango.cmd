; The CMD file.
;
; Two parts: 1. Command definition and  2. State entry
; (state entry is after the commands def section)
;
; 1. Command definition
; ---------------------
; Note: The commands are CASE-SENSITIVE, and so are the command names.
; The eight directions are:
;   B, DB, D, DF, F, UF, U, UB     (all CAPS)
;   corresponding to back, down-back, down, downforward, etc.
; The six buttons are:
;   a, b, c, x, y, z               (all lower case)
;   In default key config, abc are are the bottom, and xyz are on the
;   top row. For 2 button characters, we recommend you use a and b.
;   For 6 button characters, use abc for kicks and xyz for punches.
;
; Each [Command] section defines a command that you can use for
; state entry, as well as in the CNS file.
; The command section should look like:
;
;   [Command]
;   name = some_name
;   command = the_command
;   time = time (optional)
;   buffer.time = time (optional)
;
; - some_name
;   A name to give that command. You'll use this name to refer to
;   that command in the state entry, as well as the CNS. It is case-
;   sensitive (QCB_a is NOT the same as Qcb_a or QCB_A).
;
; - command
;   list of buttons or directions, separated by commas. Each of these
;   buttons or directions is referred to as a "symbol".
;   Directions and buttons can be preceded by special characters:
;   slash (/) - means the key must be held down
;          egs. command = /D       ;hold the down direction
;               command = /DB, a   ;hold down-back while you press a
;   tilde (~) - to detect key releases
;          egs. command = ~a       ;release the a button
;               command = ~D, F, a ;release down, press fwd, then a
;          If you want to detect "charge moves", you can specify
;          the time the key must be held down for (in game-ticks)
;          egs. command = ~30a     ;hold a for at least 30 ticks, then release
;   dollar ($) - Direction-only: detect as 4-way
;          egs. command = $D       ;will detect if D, DB or DF is held
;               command = $B       ;will detect if B, DB or UB is held
;   plus (+) - Buttons only: simultaneous press
;          egs. command = a+b      ;press a and b at the same time
;               command = x+y+z    ;press x, y and z at the same time
;   greater-than (>) - means there must be no other keys pressed or released
;                      between the previous and the current symbol.
;          egs. command = a, >~a   ;press a and release it without having hit
;                                  ;or released any other keys in between
;   You can combine the symbols:
;     eg. command = ~30$D, a+b     ;hold D, DB or DF for 30 ticks, release,
;                                  ;then press a and b together
;
;   Note: Successive direction symbols are always expanded in a manner similar
;         to this example:
;           command = F, F
;         is expanded when MUGEN reads it, to become equivalent to:
;           command = F, >~F, >F
;
;   It is recommended that for most "motion" commads, eg. quarter-circle-fwd,
;   you start off with a "release direction". This makes the command easier
;   to do.
;
; - time (optional)
;   Time allowed to do the command, given in game-ticks. The default
;   value for this is set in the [Defaults] section below. A typical
;   value is 15.
;
; - buffer.time (optional)
;   Time that the command will be buffered for. If the command is done
;   successfully, then it will be valid for this time. The simplest
;   case is to set this to 1. That means that the command is valid
;   only in the same tick it is performed. With a higher value, such
;   as 3 or 4, you can get a "looser" feel to the command. The result
;   is that combos can become easier to do because you can perform
;   the command early. Attacks just as you regain control (eg. from
;   getting up) also become easier to do. The side effect of this is
;   that the command is continuously asserted, so it will seem as if
;   you had performed the move rapidly in succession during the valid
;   time. To understand this, try setting buffer.time to 30 and hit
;   a fast attack, such as KFM's light punch.
;   The default value for this is set in the [Defaults] section below.
;   This parameter does not affect hold-only commands (eg. /F). It
;   will be assumed to be 1 for those commands.
;
; If you have two or more commands with the same name, all of them will
; work. You can use it to allow multiple motions for the same move.
;
; Some common commands examples are given below.
;
; [Command] ;Quarter circle forward + x
; name = "QCF_x"
; command = ~D, DF, F, x
;
; [Command] ;Half circle back + a
; name = "HCB_a"
; command = ~F, DF, D, DB, B, a
;
; [Command] ;Two quarter circles forward + y
; name = "2QCF_y"
; command = ~D, DF, F, D, DF, F, y
;
; [Command] ;Tap b rapidly
; name = "5b"
; command = b, b, b, b, b
; time = 30
;
; [Command] ;Charge back, then forward + z
; name = "charge_B_F_z"
; command = ~60$B, F, z
; time = 10
;
; [Command] ;Charge down, then up + c
; name = "charge_D_U_c"
; command = ~60$D, U, c
; time = 10


;-| Button Remapping |-----------------------------------------------------
; This section lets you remap the player's buttons (to easily change the
; button configuration). The format is:
;   old_button = new_button
; If new_button is left blank, the button cannot be pressed.
[Remap]
x = x
y = y
z = z
a = a
b = b
c = c
s = s

;-| Default Values |-------------------------------------------------------
[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.
command.time = 15

; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.
command.buffer.time = 1


;-| Super Motions |--------------------------------------------------------
;The following two have the same name, but different motion.
;Either one will be detected by a "command = TripleKFPalm" trigger.
;Time is set to 20 (instead of default of 15) to make the move
;easier to do.
;

;-| Special Motions |------------------------------------------------------
[Command]
name = "blocking"
command = $F,x
time = 3

[Command]
name = "blocking" ;Same name as above (buttons in opposite order)
command = x,$F
time = 3

[Command]
name = "upper_x"
command = ~F, D, DF, x

[Command]
name = "upper_y"
command = ~F, D, DF, y

[Command]
name = "upper_xy"
command = ~F, D, DF, x+y

[Command]
name = "QCF_x"
command = ~D, DF, F, x

[Command]
name = "QCF_y"
command = ~D, DF, F, y

[Command]
name = "QCF_xy"
command = ~D, DF, F, x+y

[Command]
name = "QCB_x"
command = ~D, DB, B, x

[Command]
name = "QCB_y"
command = ~D, DB, B, y

[Command]
name = "QCB_xy"
command = ~D, DB, B, x+y

[Command]
name = "QCF_a"
command = ~D, DF, F, a

[Command]
name = "QCF_b"
command = ~D, DF, F, b

[Command]
name = "QCF_ab"
command = ~D, DF, F, a+b

[Command]
name = "FF_ab"
command = F, F, a+b

[Command]
name = "FF_a"
command = F, F, a

[Command]
name = "FF_b"
command = F, F, b

[Command]
name = "BB_x"
command = B,B,x
time = 30

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y
time = 1

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

;-| Single Button |---------------------------------------------------------
[Command]
name = "a"
command = a
time = 1

[Command]
name = "b"
command = b
time = 1

[Command]
name = "c"
command = c
time = 1

[Command]
name = "x"
command = x
time = 1

[Command]
name = "y"
command = y
time = 1

[Command]
name = "z"
command = z
time = 1

[Command]
name = "start"
command = s
time = 1

;-| Hold Dir |--------------------------------------------------------------
[Command]
name = "holdfwd";Required (do not remove)
command = /$F
time = 1

[Command]
name = "holdback";Required (do not remove)
command = /$B
time = 1

[Command]
name = "holdup" ;Required (do not remove)
command = /$U
time = 1

[Command]
name = "holddown";Required (do not remove)
command = /$D
time = 1

;---------------------------------------------------------------------------
[Statedef -1]

[State -1, AI ON]  ; Turn the AI on when
Type = VarSet
TriggerAll = Var(59) < 1 ; it is not on yet and
TriggerAll = RoundState=2 ; the fight has started and is not over yet and
Trigger1 = AILevel>0 ; the computer is playing the character
v = 59
value= 1 ; value of 1 will mean the AI is on
Ignorehitpause=1

[State -1, AI OFF] ; Turn the AI off when
Type=VarSet
Trigger1=var(59)>0  ; it is on and
Trigger1=RoundState!=2  ; the round is not started yet or is already over
Trigger2=!IsHelper  ; OR if we are a player, but
Trigger2=AILevel=0  ; the computer is not in control
v=59
value=0 ; value of 0 will mean the AI is off. values other than 0 and 1 are not used in this example, we have only one AI mode, the normal one.
Ignorehitpause=1

[State -1, AI Difficulty]
Type=VarSet
Trigger1=1
var(50)=(AILevel=1)*3+(AILevel=2)*7+(AILevel=3)*16+(AILevel=4)*30+(AILevel=5)*58+(AILevel=6)*90+ (AILevel=7)*150+(AILevel=8)*300

[State -1, Guard AI]
Type=Changestate
Triggerall=Inguarddist ; Guard when in guard distance
Triggerall=var(59) ; and the AI is on
Triggerall=ctrl ; and we have control
Trigger1 = random< (var(50)*2+(AiLevel>=3)*30) ; chance is a bit higher than for attacking, but not too much. There still is a chance for missing a guard even on difficulty level 7. Only the maximum level is guarding perfectly.
value=120

[State -1, Disable Control Guard for AI] ; The engine will still guard by through pressing the back button, we need to disable that.
Type=Assertspecial
Triggerall=StateNo!=[120,160]
Trigger1=var(59)>0
flag=noairguard
flag2=nocrouchguard
flag3=nostandguard

[state -1, Jump AI]
Type=changestate
Trigger1 = var(59) && stateno!=40
Trigger1 = ctrl && P2BodyDist Y < -30 && P2BodyDist X < 30 && statetype!=A && pos y = 0
value=40

;---------------------------------------------------------------------------
;Summon Kirara
[State -1, Summon Kirara]
type = ChangeState
value = 1300
triggerall = power>=3000 && !NumHelper(1302) && stateno!=[1300,1401]
trigger1 = !var(59) && command="BB_x" && stateno=105 && statetype=A
trigger2 = var(59) && random<=var(50)*1.1 && P2MoveType!=A && statetype!=A

;---------------------------------------------------------------------------
;Miroku Assist
[State -1, Miroku Assist]
type = ChangeState
value = 1400
triggerall = statetype!=A && (ctrl || movecontact) && power>=500 && !NumHelper(1402) && stateno!=[1300,1401]
trigger1 = !var(59) && command="z"
trigger2 = var(59) && random<=var(50)*.5 && P2BodyDist X < 40 && abs(P2BodyDist Y) < 10

;---------------------------------------------------------------------------
;Air Throw Normal
[State -1, Air Throw Normal]
type = ChangeState
value = 830
triggerall = statetype=A && ctrl && P2BodyDist X <= 45 && P2StateType=A && P2StateType!=L && P2MoveType!=H && stateno!=[1300,1401]
trigger1 = !var(59) && (command="holdfwd" || command="holdback") && command="b"
trigger2 = var(59) && random<=var(50)*1.1

;---------------------------------------------------------------------------
;Stand Throw Normal
[State -1, Stand Throw Normal]
type = ChangeState
value = 800
triggerall = statetype!=A && ctrl && P2BodyDist X <= 45 && P2StateType!=A && P2StateType!=L && P2MoveType!=H && stateno!=[1300,1401]
trigger1 = !var(59) && (command="holdfwd" || command="holdback") && command="b"
trigger2 = var(59) && random<=var(50)*.9

;---------------------------------------------------------------------------
;Hop Forward
[State -1, Hop Forward]
type = ChangeState
value = 100
triggerall = statetype!=A && (ctrl || movecontact) && stateno!=[1300,1401]
trigger1 = !var(59) && command="FF"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X >= 120

;---------------------------------------------------------------------------
;Hop Forward Attack
[State -1, Hop Forward Attack]
type = ChangeState
value = 620
triggerall = statetype=A && stateno=100 && pos y < 0 && stateno!=[1300,1401]
trigger1 = !var(59) && (command="a" || command="b")
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 80

;---------------------------------------------------------------------------
;Hop Backwards
[State -1, Hop Backwards]
type = ChangeState
value = 105
triggerall = statetype!=A && (ctrl || movecontact) && stateno!=[1300,1401]
trigger1 = !var(59) && command="BB"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 40 && P2MoveType=A

;---------------------------------------------------------------------------
;Hop Backwards Attack
[State -1, Hop Backwards Attack]
type = ChangeState
value = 630
triggerall = statetype=A && stateno=105 && pos y < 0 && stateno!=[1300,1401]
trigger1 = !var(59) && (command="a" || command="b")
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 40

;---------------------------------------------------------------------------
;Kama Chain Throw
[State -1, Kama Chain Throw]
type = ChangeState
value = 1200
triggerall = StateType!=A && (ctrl || movecontact) && P2StateType!=L && stateno!=[1300,1401]
trigger1 = !var(59) && command="x" && command="holddown"
trigger2 = var(59) && random<=var(50)*.6 && P2BodyDist X < 30

;---------------------------------------------------------------------------
;Throw Hiraikotsu
[State -1, Throw Hiraikotsu]
type = ChangeState
value = 1000
triggerall = StateType!=A && (ctrl || movecontact) && P2StateType!=L && stateno!=[1300,1401]
trigger1 = !var(59) && command="x" && command="holdfwd"
trigger2 = var(59) && random<=var(50)*.6 && P2BodyDist X > 120

;---------------------------------------------------------------------------
;Throw Poison Cloud
[State -1, Throw Poison Cloud]
type = ChangeState
value = 1100
triggerall = statetype!=A && stateno!=1100 && (ctrl || movecontact) && stateno!=[1300,1401]
trigger1 = !var(59) && ((command="x" && movecontact) || (command = "x" && command!="holdfwd" && command!="holdback" && !NumProjID(1100)) || ((stateno=210 && command="a") || (stateno=230 && command="b") || (stateno=410 && command="a") || (stateno=430 && command="b")) && movecontact)
trigger2 = var(59) && random<=var(50)*.6 && ((stateno=230 || stateno=210 || stateno=410 || stateno=430) && movecontact) && P2BodyDist X < 50

;---------------------------------------------------------------------------
;Parry
[State -1, Parry]
type = ChangeState
value = 900
triggerall = statetype!=A && (ctrl || movecontact) && stateno!=[1300,1401]
trigger1 = !var(59) && command="y" && command!="holddown"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 40 && P2MoveType=A && P2StateType=S

;---------------------------------------------------------------------------
;Crouch Parry
[State -1, Crouch Parry]
type = ChangeState
value = 903
triggerall = statetype!=A && (ctrl || movecontact) && stateno!=[1300,1401]
trigger1 = !var(59) && command="y" && command="holddown"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 40 && P2MoveType=A && P2StateType=C

;---------------------------------------------------------------------------
;Crouch Heavy Boomerang Slash
[State -1, Crouch Heavy Boomerang Slash]
type = ChangeState
value = 430
triggerall = statetype!=A && movecontact && hitcount=[2,6]
triggerall = stateno!=[1300,1401]
triggerall = stateno=420 || stateno=410 || stateno=230 || stateno=400
trigger1 = !var(59) && command="b" && command="holddown"
trigger2 = var(59) && random<=var(50)*1.1

;---------------------------------------------------------------------------
;Crouch Light Boomerang Hit
[State -1, Crouch Light Boomerang Hit]
type = ChangeState
value = 420
triggerall = statetype!=A && (ctrl || movecontact)
triggerall = stateno!=[1300,1401]
triggerall = (stateno=420 || stateno=400 || stateno=220) || ctrl
trigger1 = !var(59) && command="b" && command="holddown"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 30 && abs(P2BodyDist Y) < 10

;---------------------------------------------------------------------------
;Crouch Medium Chain
[State -1, Crouch Medium Chain]
type = ChangeState
value = 410
triggerall = statetype!=A && movecontact && hitcount=[2,6]
triggerall = stateno!=[1300,1401]
triggerall = stateno=400 || stateno=430 || stateno=210 || stateno=420
trigger1 = !var(59) && command="a" && command="holddown"
trigger2 = var(59) && random<=var(50)*1.1

;---------------------------------------------------------------------------
;Crouch Light Slash
[State -1, Crouch Light Slash]
type = ChangeState
value = 400
triggerall = statetype!=A && (ctrl || movecontact)
triggerall = stateno!=[1300,1401]
triggerall = stateno=400 || stateno=420 || stateno=200 || ctrl
trigger1 = !var(59) && command="a" && command="holddown"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 25 && abs(P2BodyDist Y)<10

;---------------------------------------------------------------------------
;Stand Heavy Boomerang Slash
[State -1, Stand Heavy Boomerang Slash]
type = ChangeState
value = 230
triggerall = statetype!=A && movecontact && hitcount=[2,6]
triggerall = stateno!=[1300,1401]
triggerall = stateno=220 || stateno=210 || stateno=430 || stateno=200
trigger1 = !var(59) && command="b"
trigger2 = var(59) && random<=var(50)*1.1

;---------------------------------------------------------------------------
;Stand Light Boomerang Hit
[State -1, Stand Light Boomerang Hit]
type = ChangeState
value = 220
triggerall = statetype!=A && (movecontact || ctrl)
triggerall = stateno!=[1300,1401]
triggerall = stateno=220 || stateno=200 || stateno=420 || ctrl
trigger1 = !var(59) && command="b"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 50 && abs(P2BodyDist Y)<10

;---------------------------------------------------------------------------
;Stand Medium Slash
[State -1, Stand Medium Slash]
type = ChangeState
value = 210
triggerall = statetype!=A && movecontact && hitcount=[2,6]
triggerall = stateno!=[1300,1401]
triggerall = stateno=200 || stateno=230 || stateno=410 || stateno=220
trigger1 = !var(59) && command="a"
trigger2 = var(59) && random<=var(50)*1.1

;---------------------------------------------------------------------------
;Stand Light Slash
[State -1, Stand Light Slash]
type = ChangeState
value = 200
triggerall = statetype!=A && (ctrl || movecontact)
triggerall = stateno!=[1300,1401]
triggerall = stateno=200 || stateno=220 || stateno=400 || ctrl
trigger1 = !var(59) && command="a"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 25 && abs(P2BodyDist Y) < 10

;---------------------------------------------------------------------------
;Air Boomerang Hit
[State -1, Air Boomerang Hit]
type = ChangeState
value = 610
triggerall = statetype=A && ctrl
triggerall = stateno!=[1300,1401]
trigger1 = !var(59) && command="b"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X < 90 && abs(P2BodyDist Y) < 60

;---------------------------------------------------------------------------
;Air Chain
[State -1, Air Chain]
type = ChangeState
value = 600
triggerall = statetype=A && ctrl
triggerall = stateno!=[1300,1401]
trigger1 = !var(59) && command="a"
trigger2 = var(59) && random<=var(50)*1.1 && P2BodyDist X <100 && abs(P2BodyDist Y)<30
