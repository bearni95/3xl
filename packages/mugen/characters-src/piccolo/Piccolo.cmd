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

[Command]
name = "Transform"
command = s
time = 10


;REGULAR SUPER COMMANDS!
;--------------------------------------
[Command] 
name = "2QCF_Punch"
command = ~D, DF, F, D, DF, F, a
time = 20

[Command] 
name = "2QCF_Punch"
command = ~D, DF, F, D, DF, F, b
time = 20

[Command] 
name = "2QCF_2Punch"
command = ~D, DF, F, D, DF, F, a+b
time = 20

[Command] 
name = "2QCF_Kick"
command = ~D, DF, F, D, DF, F, x
time = 20

[Command] 
name = "2QCF_Kick"
command = ~D, DF, F, D, DF, F, y
time = 20

[Command] 
name = "2QCF_2Kick"
command = ~D, DF, F, D, DF, F, x+y
time = 20

[Command]
name = "2QCB_Punch"
command = ~D, DB, B,D, DB, B,a
time = 20

[Command]
name = "2QCB_Punch"
command = ~D, DB, B,D, DB, B,b
time = 20

[Command]
name = "2QCB_2Punch"
command = ~D, DB, B,D, DB, B,a+b
time = 20

[Command]
name = "2QCB_Kick"
command = ~D, DB, B,D, DB, B,x
time = 20

[Command]
name = "2QCB_Kick"
command = ~D, DB, B,D, DB, B,y
time = 20

[Command]
name = "2QCB_2Kick"
command = ~D, DB, B,D, DB, B,x+y
time = 20
;--------------------------------------


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
name = "Upper_PunchW"
command = ~F, D, DF, a
time = 10

[Command]
name = "QCF_PunchW"
command = ~D, DF, F, a
time = 10

[Command]
name = "QCF_PunchS"
command = ~D, DF, F, b
time = 10

[Command]
name = "QCF_PunchE"
command = ~D, DF, F, a+b
time = 10

[Command]
name = "QCB_PunchW"
command = ~D, DB, B, a
time = 10

[Command]
name = "QCB_PunchS"
command = ~D, DB, B, b
time = 10

[Command]
name = "QCB_PunchE"
command = ~D, DB, B, a+b
time = 10

[Command]
name = "QCF_KickW"
command = ~D, DF, F, x
time = 10

[Command]
name = "QCF_KickS"
command = ~D, DF, F, y
time = 10

[Command]
name = "QCF_KickE"
command = ~D, DF, F, x+y
time = 10

[Command]
name = "QCB_KickW"
command = ~D, DB, B, x
time = 10

[Command]
name = "QCB_KickS"
command = ~D, DB, B, y
time = 10

[Command]
name = "hold kick"
command = /x
time = 10

[Command]
name = "hold kick"
command = /y
time = 10

[Command]
name = "DD_PunchW"
command = ~D,D,a
time = 10

[Command]
name = "DD_PunchS"
command = ~D,D,b
time = 10


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
name = "Fwd"
command = F
time = 1

[Command]
name = "Back"
command = B
time = 1

[Command]
name = "Up"
command = U
time = 1

[Command]
name = "Down"
command = D
time = 1

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
name = "s"
command = s
time = 1

[Command]
name = "Grab"
command = a+x
time = 4

[Command]
name = "Z Gauge"
command = b+y
time = 1

[Command]
name = "Z GaugeF"
command = /$F,b+y
time = 1

[Command]
name = "Z GaugeB"
command = /$B,b+y
time = 1

[Command]
name = "Z Gauge Hold"
command = /b+y
time = 1

[Command]
name = "Charge"
command = c
time = 1

[Command]
name = "Hold Charge"
command = /c+z
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

[Command]
name = "Dash"
command = z
time = 1

[Command]
name = "B_Dash"
command = /$B,z
time = 1

[Command]
name = "Z_Dash"
command = /$U,z
time = 1

[Command]
name = "Z_Dash"
command = /$D,z
time = 1

[Command]
name = "Z_Dash"
command = /$F,z
time = 1

[Command]
name = "Z_Dash"
command = /$B,z
time = 1

[Command]
name = "Unique"
command = /$F,y
time = 1

[command]
name = "Jumping KneeW"
command = ~30$B,F,x
time = 15

[command]
name = "Jumping KneeWT"
command = ~B,F,x
time = 10

[command]
name = "Jumping KneeS"
command = ~30$B,F,y
time = 15

[command]
name = "Jumping KneeST"
command = ~B,F,y
time = 10

[command]
name = "Jumping KneeE"
command = ~30$B,F,x+y
time = 15

[command]
name = "Jumping KneeET"
command = ~B,F,x+y
time = 10

[command]
name = "Jumping KneeW"
command = ~30$B,F,~x
time = 15

[command]
name = "Jumping KneeS"
command = ~30$B,F,~y
time = 15

[command]
name = "Jumping KneeE"
command = ~30$B,F,~x+y
time = 15

[command]
name = "Arm StretchW"
command = ~30$B,F,a
time = 15

[command]
name = "Arm StretchWT"
command = ~B,F,a
time = 10

[command]
name = "Arm StretchS"
command = ~30$B,F,b
time = 15

[command]
name = "Arm StretchST"
command = ~B,F,b
time = 10

[command]
name = "Arm StretchE"
command = ~30$B,F,a+b
time = 15

[command]
name = "Arm StretchET"
command = ~B,F,a+b
time = 10

[command]
name = "Arm StretchW"
command = ~30$B,F,~a
time = 15

[command]
name = "Arm StretchS"
command = ~30$B,F,~b
time = 15

[command]
name = "Arm StretchE"
command = ~30$B,F,~a+b
time = 15

[command]
name = "Explosive WaveW"
command = ~30$D,$U,a
time = 25

[command]
name = "Explosive WaveS"
command = ~30$D,$U,b
time = 25

[command]
name = "Explosive WaveE"
command = ~30$D,$U,a+b
time = 25

[command]
name = "Explosive WaveW"
command = ~30$D,$U,~a
time = 25

[command]
name = "Explosive WaveS"
command = ~30$D,$U,~b
time = 25

[command]
name = "Explosive WaveE"
command = ~30$D,$U,~a+b
time = 25



;---------------------------------------------------------------------------
; 2. State entry
; --------------
; This is where you define what commands bring you to what states.
;
; Each state entry block looks like:
;   [State -1, Label]           ;Change Label to any name you want to use to
;                               ;identify the state with.
;   type = ChangeState          ;Don't change this
;   value = new_state_number
;   trigger1 = command = command_name
;   . . .  (any additional triggers)
;
; - new_state_number is the number of the state to change to
; - command_name is the name of the command (from the section above)
; - Useful triggers to know:
;   - statetype
;       S, C or A : current state-type of player (stand, crouch, air)
;   - ctrl
;       0 or 1 : 1 if player has control. Unless "interrupting" another
;                move, you'll want ctrl = 1
;   - stateno
;       number of state player is in - useful for "move interrupts"
;   - movecontact
;       0 or 1 : 1 if player's last attack touched the opponent
;                useful for "move interrupts"
;
; Note: The order of state entry is important.
;   State entry with a certain command must come before another state
;   entry with a command that is the subset of the first.
;   For example, command "fwd_a" must be listed before "a", and
;   "fwd_ab" should come before both of the others.
;
; For reference on triggers, see CNS documentation.
;
; Just for your information (skip if you're not interested):
; This part is an extension of the CNS. "State -1" is a special state
; that is executed once every game-tick, regardless of what other state
; you are in.


; Don't remove the following line. It's required by the CMD standard.
[Statedef -1]

[State -1, AI ON] ; Turn the AI on when
Type = VarSet
TriggerAll = Var(59) < 1; it is not on yet and
TriggerAll = RoundState=2 ; the fight has started and is not over yet and
Trigger1 = AILevel>0 ; the computer is playing the character
v = 59
value= 1 ; value of 1 will mean the AI is on
Ignorehitpause=1

[State -1, AI OFF] ; Turn the AI off when
Type=VarSet
Trigger1=var(59)>0 ; it is on and
Trigger1=RoundState!=2 ; the round is not started yet or is already over
Trigger2=!IsHelper ; OR if we are a player, but
Trigger2=AILevel=0 ; the computer is not in control
v=59
value=0 ; value of 0 will mean the AI is off. values other than 0 and 1 are not used in this example, we have only one AI mode, the normal one.
Ignorehitpause=1

[State -1]
Type=VarSet
Trigger1=1
var(50)=(AILevel=1)*3+(AILevel=2)*7+(AILevel=3)*16+(AILevel=4)*30+(AILevel=5)*58+(AILevel=6)*90+ (AILevel=7)*150+(AILevel=8)*300

[State -1]
Type=Changestate
Triggerall=Inguarddist; Guard when in guard distance
Triggerall=var(59)>0; and the AI is on
Triggerall=ctrl; and we have control
Trigger1 = random< (var(50)*2+(AiLevel>=3)*30); chance is higher than for attacking, but not by too much.
value=120

[State -1]; The engine will still guard by through pressing the back button, we need to disable that.
Type=Assertspecial
Triggerall=StateNo!=[120,160]
Trigger1=var(59)>0
flag=noairguard
flag2=nocrouchguard
flag3=nostandguard
;===========================================================================
;-| Supers |----------------------------------------------------------------
;Transform 
[State -1, Transform]
type = ChangeState
value = 7000
triggerall = statetype != A && var(11) = 1000 && Var(10) = 0
triggerall = command = "Transform"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 210 && movecontact
trigger4 = stateno = 220 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 400 && movecontact
trigger7 = stateno = 410 && movecontact
trigger8 = stateno = 420 && movecontact
trigger9 = stateno = 430 && movecontact
trigger10 = stateno = 231 && movecontact

;Light Grenade
[State -1, Light Grenade]
type = ChangeState
value = 2200
triggerall = statetype != A && power >= 3000
triggerall = command = "2QCF_2Punch"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Hellzone Grenade
[State -1, Hellzone Grenade]
type = ChangeState
value = 2100
triggerall = statetype != A && power >= 2000
triggerall = command = "2QCF_Kick"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Special Beam Cannon
[State -1, Special Beam Cannon]
type = ChangeState
value = 2000
triggerall = statetype != A && power >= 1000
triggerall = command = "2QCF_Punch"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact
;---------------------------------------------------------------------------

;-| Specials |--------------------------------------------------------------

;Explosive Wave Enhanced
[State -1, Explosive Wave]
type = ChangeState
value = 1402
triggerall = statetype != A && power >= 500
triggerall = command = "Explosive WaveE"
trigger1 = ctrl || stateno=100 || stateno=105 || stateno = 40
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact


;Explosive Wave Weak
[State -1, Explosive Wave]
type = ChangeState
value = 1400
triggerall = statetype != A
triggerall = command = "Explosive WaveW"
trigger1 = ctrl || stateno=100 || stateno=105 || stateno = 40
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Explosive Wave Heavy
[State -1, Explosive Wave]
type = ChangeState
value = 1401
triggerall = statetype != A
triggerall = command = "Explosive WaveS"
trigger1 = ctrl || stateno=100 || stateno=105 || stateno = 40
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Arm Stretch Enhanced
[State -1, Arm Stretch]
type = ChangeState
value = 1302
triggerall = var(10) = 0
triggerall = statetype != A && power >= 500
triggerall = command = "Arm StretchE"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Arm Stretch Weak
[State -1, Arm Stretch]
type = ChangeState
value = 1300
triggerall = var(10) = 0
triggerall = statetype != A
triggerall = command = "Arm StretchW"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Arm Stretch Heavy
[State -1, Arm Stretch]
type = ChangeState
value = 1301
triggerall = var(10) = 0
triggerall = statetype != A
triggerall = command = "Arm StretchS"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Jumping Knee Enhanced
[State -1, Jumping Knee]
type = ChangeState
value = 1202
triggerall = var(10) = 0
triggerall = statetype != A && power >= 500
triggerall = command = "Jumping KneeE"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Jumping Knee Weak
[State -1, Jumping Knee]
type = ChangeState
value = 1200
triggerall = var(10) = 0
triggerall = statetype != A
triggerall = command = "Jumping KneeW"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Jumping Knee Strong
[State -1, Jumping Knee]
type = ChangeState
value = 1201
triggerall = var(10) = 0
triggerall = statetype != A
triggerall = command = "Jumping KneeS"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 400 && movecontact
trigger5 = stateno = 420 && movecontact

;Dive Strike Enhanced
[State -1, Dive Strike]
type = ChangeState
value = 1102
triggerall = statetype = A && power >= 500
triggerall = command = "QCF_KickE"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact

;Dive Strike Weak
[State -1, Dive Strike]
type = ChangeState
value = 1100
triggerall = statetype = A
triggerall = command = "QCF_KickW"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 620 && movecontact

;Dive Strike Strong
[State -1, Dive Strike]
type = ChangeState
value = 1101
triggerall = statetype = A
triggerall = command = "QCF_KickS"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 620 && movecontact

;Destructive Wave Enhanced
[State -1, Destructive Wave]
type = ChangeState
value = 1002
triggerall = numhelper(1000) = 0
triggerall = statetype != A && power >= 500
triggerall = command = "QCF_PunchE"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Destructive Wave Weak
[State -1, Destructive Wave]
type = ChangeState
value = 1000
triggerall = numhelper(1000) = 0
triggerall = statetype != A
triggerall = command = "QCF_PunchW"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Destructive Wave Heavy
[State -1, Destructive Wave]
type = ChangeState
value = 1001
triggerall = numhelper(1000) = 0
triggerall = statetype != A
triggerall = command = "QCF_PunchS"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Air Destructive Wave Enhanced
[State -1, Destructive Wave]
type = ChangeState
value = 1012
triggerall = numhelper(1000) = 0
triggerall = statetype = A && power >= 500
triggerall = command = "QCF_PunchE"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact

;Air Destructive Wave Weak
[State -1, Destructive Wave]
type = ChangeState
value = 1010
triggerall = numhelper(1000) = 0
triggerall = statetype = A
triggerall = command = "QCF_PunchW"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 620 && movecontact

;Air Destructive Wave Heavy
[State -1, Destructive Wave]
type = ChangeState
value = 1011
triggerall = numhelper(1000) = 0
triggerall = statetype = A
triggerall = command = "QCF_PunchS"
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 620 && movecontact
;---------------------------------------------------------------------------
;Transform Arm Stretch Enhanced
[State -1, Arm Stretch]
type = ChangeState
value = 1302
triggerall = var(10) = 1
triggerall = statetype != A && power >= 500
triggerall = command = "Arm StretchET"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Transform Arm Stretch Weak
[State -1, Arm Stretch]
type = ChangeState
value = 1300
triggerall = var(10) = 1
triggerall = statetype != A
triggerall = command = "Arm StretchWT"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Transform Arm Stretch Heavy
[State -1, Arm Stretch]
type = ChangeState
value = 1301
triggerall = var(10) = 1
triggerall = statetype != A
triggerall = command = "Arm StretchST"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Transform Jumping Knee Enhanced
[State -1, Jumping Knee]
type = ChangeState
value = 1202
triggerall = var(10) = 1
triggerall = statetype != A && power >= 500
triggerall = command = "Jumping KneeET"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Transform Jumping Knee Weak
[State -1, Jumping Knee]
type = ChangeState
value = 1200
triggerall = var(10) = 1
triggerall = statetype != A
triggerall = command = "Jumping KneeWT"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact

;Transform Jumping Knee Strong
[State -1, Jumping Knee]
type = ChangeState
value = 1201
triggerall = var(10) = 1
triggerall = statetype != A
triggerall = command = "Jumping KneeST"
trigger1 = ctrl || stateno=100 || stateno=105
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact
;---------------------------------------------------------------------------
;Auto Dash Back
[State -1 Auto Dash]
type = Changestate
value = 111
triggerall = command = "B_Dash"
triggerall = statetype = A
triggerall = movetype != H
Triggerall = stateno != 110
Triggerall = stateno != 111
trigger1 = ctrl

;Auto Dash
[State -1 Auto Dash]
type = Changestate
value = 110
triggerall = command = "Dash"
triggerall = statetype = A
triggerall = movetype != H
Triggerall = stateno != 110
Triggerall = stateno != 111
trigger1 = ctrl

;Auto Dash Ground Back
[State -1 Auto Dash]
type = Changestate
value = 105
triggerall = command = "B_Dash"
triggerall = statetype = S
trigger1 = ctrl

;Auto Dash Ground Forward
[State -1 Auto Dash]
type = Changestate
value = 100
triggerall = command = "Dash"
triggerall = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;-| Attacks |---------------------------------------------------------------
;Charge
[State -1, Charge]
type = ChangeState
value = 900
triggerall = statetype = S
Triggerall = power != powermax
triggerall = ctrl
trigger1 = command = "Charge"

;--------------------------------------------------------------------------
;Grab
[State -1 Grab]
type = Changestate
value = 700
triggerall = statetype = S
triggerall = ctrl
trigger1 = command = "Grab"

;Air Grab
[State -1 Grab]
type = Changestate
value = 702
triggerall = statetype = A
triggerall = ctrl
trigger1 = command = "Grab"

;--------------------------------------------------------------------------
;-| Z-Gauge |-----------------------------------------------------------------------
;Z-Skill
[State -1 Z-Skill]
type = Changestate
value = 800
triggerall = Var(11) >= 200
triggerall = command = "Z Gauge"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 400 && movecontact
trigger4 = stateno = 420 && movecontact

;Z-Escape Forward
[State -1 Z-EscapeF]
type = Changestate
value = 820
triggerall = life > 0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = statetype != A
triggerall = command = "Z GaugeF"
triggerall = Var(11) >= 500
trigger1 = stateno = 5000
trigger2 = stateno = 5001
trigger3 = stateno = 5010
trigger4 = stateno = 5011
trigger5 = stateno = 5070
trigger6 = stateno = 5071

;Z-Escape Backward
[State -1 Z-EscapeB]
type = Changestate
value = 821
triggerall = life > 0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = statetype != A
triggerall = command = "Z GaugeB"
triggerall = Var(11) >= 500
trigger1 = stateno = 5000
trigger2 = stateno = 5001
trigger3 = stateno = 5010
trigger4 = stateno = 5011
trigger5 = stateno = 5070
trigger6 = stateno = 5071

;Z-Escape Forward Air
[State -1 Z-EscapeF]
type = Changestate
value = 822
triggerall = life > 0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = statetype = A
triggerall = command = "Z GaugeF"
triggerall = Var(11) >= 500
trigger1 = stateno = 5020
trigger2 = stateno = 5030
trigger3 = stateno = 5035
trigger4 = stateno = 5040
trigger5 = stateno = 5050

;Z-Escape Backward Air
[State -1 Z-EscapeB]
type = Changestate
value = 823
triggerall = life > 0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = statetype = A
triggerall = command = "Z GaugeB"
triggerall = Var(11) >= 500
trigger1 = stateno = 5020
trigger2 = stateno = 5030
trigger3 = stateno = 5035
trigger4 = stateno = 5040
trigger5 = stateno = 5050

;Z-Escape Forward Guard
[State -1 Z-EscapeF]
type = Changestate
value = 824
triggerall = life > 0
triggerall = statetype != A
triggerall = command = "Z GaugeF"
triggerall = Var(11) >= 200
trigger1 = stateno = 150
trigger2 = stateno = 151
trigger3 = stateno = 152
trigger4 = stateno = 153

;Z-Escape Backward Guard
[State -1 Z-EscapeB]
type = Changestate
value = 825
triggerall = life > 0
triggerall = statetype != A
triggerall = command = "Z GaugeB"
triggerall = Var(11) >= 200
trigger1 = stateno = 150
trigger2 = stateno = 151
trigger3 = stateno = 152
trigger4 = stateno = 153


;--------------------------------------------------------------------------
;Run Fwd
[State -1, Run Fwd]
type = ChangeState
triggerall = statetype != A
value = 100
triggerall = command = "FF"
trigger1 = ctrl

;Run Fwd Air
[State -1, Run Fwd]
type = ChangeState
triggerall = statetype = A
value = 101
triggerall = command = "FF"
trigger1 = ctrl

;---------------------------------------------------------------------------
;Run Back
[State -1, Run Back]
type = ChangeState
triggerall = statetype != A
value = 105
triggerall = command = "BB"
trigger1 = ctrl

;Run Back Air
[State -1, Run Back]
type = ChangeState
triggerall = statetype = A
value = 106
triggerall = command = "BB"
trigger1 = ctrl

;---------------------------------------------------------------------------
;Rush Combo 1
[State -1, Rush Combo]
type = ChangeState
value = 6000
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = stateno = 200 && movehit

;Rush Combo 2
[State -1, Rush Combo]
type = ChangeState
value = 6001
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = stateno = 6000 && movehit

;Rush Combo 3
[State -1, Rush Combo]
type = ChangeState
value = 2000
triggerall = statetype != A && power >= 1000
triggerall = command = "a"
trigger1 = stateno = 6001 && movehit
;===========================================================================
;---------------------------------------------------------------------------
;Stand Light Punch
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = (stateno = 200) && time > 11 && !movehit

;---------------------------------------------------------------------------
;Stand Strong Punch
[State -1, Stand Strong Punch]
type = ChangeState
value = 210
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = ctrl


;---------------------------------------------------------------------------
;Stand Light Kick
[State -1, Stand Light Kick]
type = ChangeState
value = 220
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = ctrl
;---------------------------------------------------------------------------
;Unique
[State -1, Unique]
type = ChangeState
value = 231
triggerall = command = "Unique"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = ctrl


;---------------------------------------------------------------------------
;Standing Strong Kick
[State -1, Standing Strong Kick]
type = ChangeState
value = 230
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = (stateno = 220) && time > 9
trigger3 = (stateno = 220) && movecontact

;---------------------------------------------------------------------------

;---------------------------------------------------------------------------
;Crouching Light Punch
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "a"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Strong Punch
[State -1, Crouching Strong Punch]
type = ChangeState
value = 410
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = ctrl


;---------------------------------------------------------------------------
;Crouching Light Kick
[State -1, Crouching Light Kick]
type = ChangeState
value = 420
triggerall = command = "x"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = (stateno = 420) && time > 9

;---------------------------------------------------------------------------
;Crouching Strong Kick
[State -1, Crouching Strong Kick]
type = ChangeState
value = 430
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jump Light Punch
[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = command = "a"
triggerall = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jump Strong Punch
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = command = "b"
triggerall = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jump Light Kick
[State -1, Jump Light Kick]
type = ChangeState
value = 620
triggerall = command = "x"
triggerall = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jump Strong Kick
[State -1, Jump Strong Kick]
type = ChangeState
value = 630
triggerall = command = "y"
triggerall = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------


;===================================================;
;                       A.I.                        ;
;===================================================;
[State 0, VarRandom]
type = VarRandom
trigger1 = p2bodydist x < 20 && enemy,movetype !=H
v = 55
range = 0,100

;Transform
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = var(10) = 0
triggerall = Var(11) >= 1000
trigger1  = random < 3
value = 7000

;Charge
[State -1, AI]
type = ChangeState
triggerall = ctrl
triggerall = var(59)>0
triggerall = power < 4000
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = random < 35
trigger1 = (p2dist x) > 50
value = 900

;Dash
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x > 60
trigger1  = random < 5
value = 100

;Z-Skill
[State -1, AI]
Type=Changestate
triggerall = stateno !=  [2000,2900]
triggerall = stateno !=  [800,810]
triggerall = var(59)>0
Triggerall= Statetype !=A
triggerall = Movetype !=H
triggerall = Var(11) >= 200
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
triggerall  = random < 100
trigger1 = ctrl
value = 800

;Z-Escape
[State -1, AI]
Type=Changestate
triggerall = var(59)>0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = life <= 700
triggerall = alive
triggerall = Var(11) >= 500
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = stateno = 5000
trigger2 = stateno = 5001
trigger3 = stateno = 5010
trigger4 = stateno = 5011
trigger5 = stateno = 5070
trigger6 = stateno = 5071
value = 820

;Z-Escape Air
[State -1, AI]
Type=Changestate
triggerall = var(59)>0
triggerall = var(5)= 0
triggerall = Enemy, StateNo != [700,710]
triggerall = life <= 700
triggerall = alive
triggerall = Var(11) >= 500
Triggerall= Statetype =A
Triggerall=AILevel>=1
trigger1 = stateno = 5000
trigger2 = stateno = 5001
trigger3 = stateno = 5010
trigger4 = stateno = 5011
trigger5 = stateno = 5070
trigger6 = stateno = 5071
value = 822

;Grab
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 30
trigger1 = random < 70
trigger2 = enemy,stateno = [120,155]
value = 700

;Standing Light Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 200

;Standing Heavy Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 210

;Unique
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 55
trigger1  = random < 40
value = 231

;Standing Light Kick
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 40
value = 220

;Standing Heavy Kick
[State -1, AI]
Type=Changestate
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = ctrl && random < 30
trigger2 = stateno = 220 && movehit
value = 230

;Crouching Light Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 400

;Crouching Heavy Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 410

;Crouching Light Kick
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 420

;Crouching Heavy Kick
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 430

;Jumping Light Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype =A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 600

;Jumping Heavy Punch
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype =A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 610

;Jumping Light Kick
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype =A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 620

;Jumping Heavy Kick
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = var(59)>0
Triggerall= Statetype =A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 30
value = 630

;Dive Strike
[State -1, AI]
Type=Changestate
triggerall = ctrl
triggerall = power >= 500
triggerall = var(59)>0
Triggerall= Statetype =A
Triggerall=AILevel>=1
triggerall = p2bodydist x < 45
trigger1  = random < 70
value = 1102

;Light Grenade
[State -1, AI]
Type=Changestate
triggerall = var(59)>0
triggerall = power >= 3000
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = ctrl
value = 2200

;Hellzone Grenade
[State -1, AI]
Type=Changestate
triggerall = var(59)>0
triggerall = power >= 2000
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = ctrl
value = 2100

;Special Beam Cannon
[State -1, Combo 1]
Type=Changestate
triggerall = var(59)>0
triggerall = power >= 1000
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = ctrl && random < 200
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact
value = 2000

;Combo 1
[State -1, Combo 1]
Type=Changestate
triggerall = power >= 500
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = ctrl && random < 200
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact
value = 1202

;Combo 2
[State -1, Combo 1]
Type=Changestate
triggerall = power >= 500
triggerall = var(59)>0
Triggerall= Statetype !=A
Triggerall=AILevel>=1
trigger1 = ctrl && random < 200
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 400 && movecontact
trigger6 = stateno = 420 && movecontact
value = 1302