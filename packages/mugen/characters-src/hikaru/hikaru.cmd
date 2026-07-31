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
;[Remap]
;x = x
;y = y
;z = z
;a = a
;b = b
;c = c
;s = s

;-| Default Values |-------------------------------------------------------
[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.
command.time = 15

; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.
command.buffer.time = 1


;-|AI ACTIVATION |---------------------------------------------------------

[Command]
name = "CPU0"
command = U,U,D,D,B,F,B,F,s,s,s
time = 0

[Command]
name = "CPU1"
command = U,U,D,D,B,F,B,F,a,a,s
time = 0

[Command]
name = "CPU2"
command = U,U,D,D,B,F,B,F,b,b,s
time = 0

[Command]
name = "CPU3"
command = U,U,D,D,B,F,B,F,c,c,s
time = 0

[Command]
name = "CPU4"
command = U,U,D,D,B,F,B,F,x,x,s
time = 0

[Command]
name = "CPU5"
command = U,U,D,D,B,F,B,F,y,y,s
time = 0

[Command]
name = "CPU6"
command = U,U,D,D,B,F,B,F,z,z,s
time = 0

[Command]
name = "CPU7"
command = U,U,D,D,B,F,B,F,a,a,a,s
time = 0

[Command]
name = "CPU8"
command = U,U,D,D,B,F,B,F,a,a,a,a,s
time = 0

[Command]
name = "CPU9"
command = U,D,B,F,b,b,s
time = 0

[Command]
name = "CPU10"
command = D,B,F,B,F,b,b,s
time = 0

[Command]
name = "CPU11"
command = U,D,D,B,F,b,b,s
time = 0

[Command]
name = "CPU12"
command = U,U,D,F,B,F,b,s
time = 0

[Command]
name = "CPU13"
command = U,U,D,D,B,F,x,x,s
time = 0

[Command]
name = "CPU14"
command = U,U,D,D,B,F,x,s
time = 0

[Command]
name = "CPU15"
command = D,D,B,F,B,F,x,s
time = 0

[Command]
name = "CPU16"
command = D,D,B,F,B,F,x,x,s
time = 0

[Command]
name = "CPU17"
command = U,U,D,D,B,F,B,F,x,x,s
time = 0

[Command]
name = "CPU18"
command = U,U,D,B,F,B,F,x,s
time = 0

[Command]
name = "CPU19"
command = U,U,B,F,B,F,y,y,s
time = 0

[Command]
name = "CPU20"
command = U,U,D,B,F,B,F,y,y,s
time = 0

[Command]
name = "CPU21"
command = U,U,U,U,B,F,B,F,y,s
time = 0

[Command]
name = "CPU22"
command = U,U,U,U,B,F,B,F,y,y,s
time = 0

[Command]
name = "CPU23"
command = U,U,D,D,U,U,B,F,y,s
time = 0

[Command]
name = "CPU24"
command = U,U,D,D,B,F,U,U,y,s
time = 0

[Command]
name = "CPU25"
command = U,U,U,U,U,U,B,F,y,s
time = 0

[Command]
name = "CPU26"
command = U,U,D,D,U,U,B,F,x,s
time = 0

[Command]
name = "CPU27"
command = U,U,D,D,B,F,D,D,x,s
time = 0

[Command]
name = "CPU28"
command = U,D,B,F,B,F,x,x,x,s
time = 0

[Command]
name = "CPU29"
command = U,D,U,D,U,D,x,x,s
time = 0

[Command]
name = "CPU30"
command = U,D,U,D,U,D,a,s
time = 0

[Command]
name = "CPU31"
command = U,D,U,D,U,D,a,a,a,s
time = 0

[Command]
name = "CPU32"
command = B,F,B,F,B,F,B,F,a,a,s
time = 0

[Command]
name = "CPU33"
command = B,F,B,F,B,F,B,F,a,s
time = 0

[Command]
name = "CPU34"
command = U,U,B,F,B,F,B,F,b,s
time = 0

[Command]
name = "CPU35"
command = B,F,D,D,B,F,B,F,b,s
time = 0

[Command]
name = "CPU36"
command = B,F,D,D,B,F,B,F,b,b,s
time = 0

[Command]
name = "CPU37"
command = U,U,D,D,B,F,D,B,s,s
time = 0

[Command]
name = "CPU38"
command = U,U,D,D,B,F,D,B,s
time = 0

[Command]
name = "CPU39"
command = U,U,D,B,F,D,B,F,s
time = 0

[Command]
name = "CPU40"
command = U,U,D,B,F,D,B,F,a,s
time = 0

[Command]
name = "CPU41"
command = U,U,D,B,F,D,B,F,b,s
time = 0

[Command]
name = "CPU42"
command = U,U,D,B,F,D,B,F,x,s
time = 0

[Command]
name = "CPU43"
command = U,U,D,B,F,D,B,F,y,s
time = 0

[Command]
name = "CPU44"
command = U,U,D,B,F,D,B,F,a,a,s
time = 0

[Command]
name = "CPU45"
command = U,U,D,B,F,D,B,F,b,b,s
time = 0

[Command]
name = "CPU46"
command = U,U,D,B,F,D,B,F,x,x,s
time = 0

[Command]
name = "CPU47"
command = U,U,D,B,F,D,B,F,y,y,s
time = 0

[Command]
name = "CPU48"
command = U,D,B,F,F,B,s,s
time = 0

[Command]
name = "CPU49"
command = U,D,B,F,F,B,a,s
time = 0

[Command]
name = "CPU50"
command = U,D,B,F,F,B,b,s
time = 0

[Command]
name = "CPU51"
command = U,D,B,F,F,B,x,s
time = 0

[Command]
name = "CPU52"
command = U,D,B,F,F,B,y,s
time = 0

[Command]
name = "CPU53"
command = U,D,B,F,F,B,a,a,s
time = 0

[Command]
name = "CPU54"
command = U,D,B,F,F,B,b,b,s
time = 0

[Command]
name = "CPU55"
command = U,D,B,F,F,B,x,x,s
time = 0

[Command]
name = "CPU56"
command = U,D,B,F,F,B,y,y,s
time = 0

[Command]
name = "CPU57"
command = B,F,U,D,F,B,s
time = 0

[Command]
name = "CPU58"
command = B,F,U,D,F,B,x,s
time = 0

[Command]
name = "CPU59"
command = B,F,U,D,F,B,y,s
time = 0

[Command]
name = "CPU60"
command = B,F,U,D,F,B,a,s
time = 0

[Command]
name = "CPU61"
command = B,F,U,D,F,B,b
time = 0

[Command]
name = "CPU62"
command = B,F,D,F,B,U,D,F,B,s
time = 0

[Command]
name = "CPU63"
command = B,F,D,F,B,U,D,F,B,a
time = 0

[Command]
name = "CPU64"
command = B,F,D,F,B,U,D,F,B,b
time = 0

[Command]
name = "CPU65"
command = B,F,D,F,B,U,D,F,B,x
time = 0

[Command]
name = "CPU66"
command = B,F,D,F,B,U,D,F,B,y
time = 0

[Command]
name = "CPU67"
command = U,U,D,D,B,F,B,F,b
time = 0

[Command]
name = "CPU68"
command = U,U,D,D,B,F,B,F,y
time = 0

[Command]
name = "CPU69"
command = U,U,D,D,B,F,B,F,s
time = 0

[Command]
name = "CPU70"
command = U,U,D,D,B,F,B,F,a,s
time = 0

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

[Command]
name = "DU"
command = ~D, U
time = 10

;-| Hyper Motions |--------------------------------------------------------




;-| Kyosuke - Johnny |---------------------------

;-----------------------------------------------------

[Command]
name = "hyper_kyosuke"
command = ~D, DF, F, a+x

[Command]
name = "hyper_cycle"
command = ~D, DF, F, b+y

[Command]
name = "mxk"
command = ~D, DF, F, c+z

;---------------------

;-----------------------------------------------------




;------| Madoka - Sabrina |-----------------------------------------------

;Mega Combo
[Command]
name = "kcombo"
command = ~D, DF, F, x+y

;Mega Combo
[Command]
name = "kcombo"
command = ~D, DF, F, x+z

;Mega Combo
[Command]
name = "kcombo"
command = ~D, DF, F, y+z

;-----------------------------------------------------

;Speed Attack
[Command]
name = "attack"
command = ~D, DF, F, a+b

;Speed Attack
[Command]
name = "attack"
command = ~D, DF, F, a+c

;Speed Attack
[Command]
name = "attack"
command = ~D, DF, F, b+c

;-----------------------------------------------------

;Air hyper Combo
[Command]
name = "air-combo"
command = ~D, DF, F, a+b

;Air hyper Combo
[Command]
name = "air-combo"
command = ~D, DF, F, a+c

;Air hyper Combo
[Command]
name = "air-combo"
command = ~D, DF, F, b+c


;---| Hikaru - Tinetta |--------------------------------------------------


[Command]
name = "hyper_hikaru"
command = B, DB, D, DF, F, a+b
time = 40

[Command]
name = "hyper_hikaru"
command = B, DB, D, DF, F, a+c
time = 40

[Command]
name = "hyper_hikaru"
command = B, DB, D, DF, F, b+c
time = 40

[Command]
name = "hyper_hikaru"
command = B, DB, D, a+b
time = 40

[Command]
name = "hyper_hikaru"
command = D, DB, B, a+b
time = 40

[Command]
name = "hyper_hikaru"
command = B, DB, D, a+c
time = 40

[Command]
name = "hyper_hikaru"
command = B, DB, D, b+c
time = 40

;-----------------------------------------------------


;-| Special Motions |------------------------------------------------------

[Command]
name = "3K"
command = a+b+c
time = 1

;-----------------------------------------------------
;Hikaru - Tinetta (work only if Hikaru isn' t in)

[Command]
name = "hikaru1"
command =~D, DB, B, a

[Command]
name = "hikaru2"
command =~D, DB, B, b

[Command]
name = "hikaru3"
command =~D, DB, B, c
;-----------------------------------------------------

[Command]
name = "knee_att"
command = ~D, DF, F, x
;combo start

[Command]
name = "wrench_dash" 
command = ~D, DF, F, y

[Command]
name = "uppercut"
command = ~D, DF, F, z

;-----------------------------------------------------

[Command]
name = "roll"
command = ~D, DF, F, a

[Command]
name = "rose"
command = ~D, DF, F, b

[Command]
name = "cards"
command = ~D, DF, F, c

;-----------------------------------------------------


[Command]
name = "jumpcards"
command = ~D, DF, F, c




[Command]
name = "angle_kick1"
command = ~D, DB, B, b

[Command]
name = "angle_kick2"
command = ~D, DB, B, c




;-----------KYOSUKE - JOHNNY - specials---------------------------------------------

[Command]
name = "kyosuke_basket"
command = ~B, F, a

[Command]
name = "kyosuke_music"
command = ~B, F, b

[Command]
name = "kyosuke_table"
command = ~B, F, c


[Command]
name = "kyosuke_fall"
command = ~B, F, x

[Command]
name = "kyosuke_rubber"
command = ~B, F, y

[Command]
name = "kyosuke_3objects"
command = ~B, F, z


;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y+z+a+b+c+s
time = 1

[Command]
name = "b+x"
command = b+x
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
name = "hold c"
command = /c
time = 1

[Command]
name = "hold z"
command = /z
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

;-| Press Up |--------------------------------------------------------------

[Command]
name = "Press Up"
command = U
time = 1

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

;-|AI Activation|------------------------------------------------------------------
 [State -1, Combo condition Reset]
type = VarSet
trigger1 = 1
var(1) = 0

[State -1, Combo condition Check]
type = VarSet
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = (stateno = [200,299]) || (stateno = [400,499])
trigger2 = stateno != 440 ;Except for sweep kick
trigger2 = movecontact
var(1) = 1


;-|HYPERS/FINALS|-------------------------------------------------------------------



;===========================================================================


[State -1, speed attack]
type = ChangeState
value = 33300
triggerall = command = "attack"
triggerall = power >= 1000
trigger1 = Statetype != A && ctrl
trigger2 = (StateType != A) && (HitdefAttr = SC, NA) && (MoveContact)

[State -1, hyper attack]
type = ChangeState
value = 31470
triggerall = command = "kcombo"
triggerall = power >= 2000
trigger1 = Statetype != A && ctrl
trigger2 = (StateType != A) && (HitdefAttr = SC, NA) && (MoveContact)


;===========================================================================




;-----------------------------------------------------------
;Hikaru - HYPER
[State -1,hikaru hyper]
type = ChangeState
value = 8200
triggerall = numhelper(8302) <= 0
triggerall = numhelper(8402) <= 0
triggerall = numhelper(8502) <= 0
trigger1 = command = "hyper_hikaru"
triggerall = command != "hikaru1"
triggerall = command != "hikaru2"
triggerall = command != "hikaru3"
triggerall = stateno != 23000
triggerall = stateno != 33000
triggerall = stateno != 43000
triggerall = statetype != A
triggerall = numhelper(23000) = 0
triggerall = numhelper(33000) = 0
triggerall = numhelper(43000) = 0
trigger1 = statetype != A && power >= 2000
trigger1 = ctrl


;-----------------------------

;-|KYOSUKE - Johnny|------------------------------------------------------------------------



;------------86070 - Madoka X Kyosuke-(Angry Kasuga mode)-----------

[State -1, Madoka X Kyosuke]
type = ChangeState
value = 86070
;triggerall = !var(59)
triggerall = command = "mxk" 
triggerall = power >= 2000
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51)

;-----------------------------------------------

; KYOSUKE - Johnny
[State -1,KYOSUKE - Johnny]
type = ChangeState
value = 12200
triggerall = command = "hyper_cycle"
triggerall = statetype != A && power >= 1000
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

;-----------------------------------------------

; KYOSUKE - Johnny
[State -1,KYOSUKE - Johnny]
type = ChangeState
value = 12500
triggerall = command = "hyper_kyosuke"
triggerall = statetype != A && power >= 1000
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

;-----------------------------------------------

; KYOSUKE - Johnny
[State -1,KYOSUKE - table - Johnny]
type = ChangeState
value = 2200
triggerall = command = "kyosuke_table"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

; KYOSUKE - Johnny
[State -1,KYOSUKE - falling items - Johnny]
type = ChangeState
value = 2210
triggerall = command = "kyosuke_music"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

; kyosuke_basket
[State -1,kyosuke_basket]
type = ChangeState
value = 2220
triggerall = command = "kyosuke_basket"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

; kyosuke_fall_items
[State -1,kyosuke_sofa]
type = ChangeState
value = 12700
triggerall = command = "kyosuke_fall"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]

; kyosuke_rubber
[State -1,kyosuke_rubber]
type = ChangeState
value = 12220
triggerall = command = "kyosuke_rubber"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500
;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]


; kyosuke_3_objects
[State -1,kyosuke_basket]
type = ChangeState
value = 2400
triggerall = command = "kyosuke_3objects"
triggerall = statetype != A
triggerall = helper(1400), stateno = 1500

;trigger2 = Var(30) = 1
trigger1 = ctrl = 1
;trigger1 = P2BodyDist X = [0, 285]


;-|ANIMALS|------------------------------------------------------------------------




;-----------------------------------------------------

;----|HIKARU - Tinetta|----------------------------

[State -1, call hikaru 1]
type = ChangeState
value = 23000
triggerall = command = "hikaru1"
triggerall = command != "hikaru2"
triggerall = command != "hikaru3"
triggerall = command != "hyper_hikaru"
triggerall = stateno != 33000
triggerall = stateno != 43000
triggerall = stateno != 8200
triggerall = statetype != A
triggerall = numhelper(33000) = 0
triggerall = numhelper(43000) = 0
triggerall = numhelper(8200) = 0
triggerall = numhelper(8302) <= 0
triggerall = numhelper(8402) <= 0
triggerall = numhelper(8502) <= 0
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)


[State -1, call hikaru 2]
type = ChangeState
value = 33000
triggerall = command = "hikaru2"
triggerall = command != "hikaru1"
triggerall = command != "hikaru3"
triggerall = command != "hyper_hikaru"
triggerall = stateno != 23000
triggerall = stateno != 43000
triggerall = stateno != 8200
triggerall = statetype != A
triggerall = numhelper(23000) = 0
triggerall = numhelper(43000) = 0
triggerall = numhelper(8200) = 0
triggerall = numhelper(8302) <= 0
triggerall = numhelper(8402) <= 0
triggerall = numhelper(8502) <= 0
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)


[State -1, call hikaru 3]
type = ChangeState
value = 43000
triggerall = command = "hikaru3"
triggerall = command != "hikaru1"
triggerall = command != "hikaru2"
triggerall = command != "hyper_hikaru"
triggerall = stateno != 23000
triggerall = stateno != 33000
triggerall = stateno != 8200
triggerall = statetype != A
triggerall = numhelper(23000) = 0
triggerall = numhelper(33000) = 0
triggerall = numhelper(8200) = 0
triggerall = numhelper(8302) <= 0
triggerall = numhelper(8402) <= 0
triggerall = numhelper(8502) <= 0
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)


;---------------------------------------------------------------------------

;---------------------------------------------------------------------------


;-|SPECIALS|------------------------------------------------------------------------
;---------------------------------------------------------------------------
[State -1, knee attack]
type = ChangeState
value = 1460
triggerall = command = "knee_att"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)

;---------------------------------------------------------------------------
[State -1, wrench dash]
type = ChangeState
value = 1470
triggerall = command = "wrench_dash"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)

;---------------------------------------------------------------------------
[State -1, uppercut]
type = ChangeState
value = 1480
triggerall = command = "uppercut"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)

;---------------------------------------------------------------------------
[State -1, roll]
type = ChangeState
value = 1535
triggerall = command = "roll"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)


;---------------------------------------------------------------------------
[State -1, 20200]
type = ChangeState
value = 20200
triggerall = command = "rose"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)


;---------------------------------------------------------------------------
[State -1, 20300]
type = ChangeState
value = 20300
triggerall = command = "cards"
triggerall = statetype != A
trigger1 = ctrl
trigger2 = var(51) = 1
trigger3 = (HitdefAttr = SCA, NA) && (MoveContact)

;---------------------------------------------------------------------------


;Wall Cling
[State -1, Wall]
type = ChangeState
trigger1 = statetype = A && ctrl
trigger1 = command = "holdfwd"
trigger1 = BackEdgeBodyDist <= 0
trigger1 = vel x < 0 && pos y <= -92
trigger2 = statetype = A && ctrl
trigger2 = command = "holdback"
trigger2 = FrontEdgeBodyDist <= 10
trigger2 = vel x > 0 && pos y <= -92
value = 255
ctrl = 0

;-|BUTTON COMBINATIONS|-------------------------------------------------------------


;-|NORMAL HIT/COMBOS|---------------------------------------------------------------


;---------------------------------------------------------------------------
;Run Fwd
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl



;---------------------------------------------------------------------------
;Run Back
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;Presa
[State -1, Throw]
type = ChangeState
value = 800
triggerall = command = "z"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 3
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 5
trigger2 = (p2statetype = S) || (p2statetype = C)
trigger2 = p2movetype != H
;===========================================================================

;---------------------------------------------------------------------------
; Superjump
[State -1, Superjump]
type = ChangeState
value = 700
triggerall = (StateType != A) && (Var(0) = 0)
trigger1 = (command = "DU") && (Ctrl)
trigger2 = (command = "3K") && (Ctrl)
trigger3 =  stateno = 420 && movehit && command="holdup"

;---------------------------------------------------------------------------
; Taunt
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "s"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------


;---------------------------------------------------------------
;----------------Flyng Hypers------------------------------------
;---------------------------------------------------------------


[State -1, jump hyper combo]
type = ChangeState
value = 43501
triggerall = command = "air-combo"
triggerall = power>1000
triggerall = var(1) != 1
triggerall = command != "holddown"
trigger1 = (statetype = a) && ctrl
trigger2 = (stateno = 600) && movecontact
trigger3 = (stateno = 610) && movecontact
trigger4 = (stateno = 630) && movecontact
trigger5 = (stateno = 640) && movecontact

;--------------------------------------------------------------------

;Jump CARDS
[State -1,]
type = ChangeState
value = 670
triggerall = command = "jumpcards"
trigger1 = statetype = A
trigger1 = ctrl

;-----------------------------------

;Jump angle kick 1
[State -1,]
type = ChangeState
value = 19500
triggerall = command = "angle_kick1"
trigger1 = statetype = A
trigger1 = ctrl


;Jump angle kick 2
[State -1,]
type = ChangeState
value = 19510
triggerall = command = "angle_kick2"
trigger1 = statetype = A
trigger1 = ctrl
;-----------------------------------






;---------------------------------------------------------------------------
[State -1, Pugno debole]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
;trigger2 = stateno = 200 && (movecontact)
trigger2 = stateno = 100


[State -1, Pugno medio 2]
type = ChangeState
value = 201
trigger1 = P2BodyDist X > 15
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200 && (movecontact)
trigger3 = stateno = 100


[State -1, Pugno medio]
type = ChangeState
value = 210
trigger1 = P2BodyDist X <= 15
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200 && (movecontact)
trigger3 = stateno = 201 && (movecontact)
trigger4 = stateno = 100



[State -1, Pugno forte]
type = ChangeState
value = 220
triggerall = command = "z"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 210 && (movecontact)
trigger3 = stateno = 200 && (movecontact)
trigger4 = stateno = 201 && (movecontact)
trigger5 = stateno = 100


;trigger3 = stateno = 100


[State -1, Calcio debole]
type = ChangeState
value = 230
trigger1 = P2BodyDist X <= 15
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200 && (movecontact)
trigger3 = stateno = 201 && (movecontact)
trigger4 = stateno = 100

[State -1, Calcio vicino]
type = ChangeState
value = 231
trigger1 = P2BodyDist X > 15
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200 && (movecontact)
trigger3 = stateno = 201 && (movecontact)
trigger4 = stateno = 100


[State -1, Calcio medio]
type = ChangeState
value = 240
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 230 && (movecontact)
trigger3 = stateno = 210 && (movecontact)
trigger4 = stateno = 100


[State -1, Calcio forte]
type = ChangeState
value = 250
triggerall = command = "c"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 230 && (movecontact)
trigger3 = stateno = 240 && (movecontact)
trigger4 = stateno = 100



;---------------------------------------------------------------------------



[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 400 && (movecontact)
trigger3 = stateno = 430 && (movecontact)
trigger4 = stateno = 100


[State -1, Crouching Medium Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 400 && (movecontact)
trigger3 = stateno = 440 && (movecontact)
trigger4 = stateno = 100

[State -1, Crouching Strong Punch]
type = ChangeState
value = 420
triggerall = (command = "z") && (statetype = C) && !Var(59)
trigger1 = ctrl
trigger2 = stateno = 410 && (movecontact)
trigger3 = stateno = 400 && (movecontact)
trigger4 = stateno = 100

[State -1, Crouching Light Kick]
type = ChangeState
value = 430
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 400 && (movecontact)
trigger3 = stateno = 100


[State -1, Crouching High Kick]
type = ChangeState
value = 440
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 430 && (movecontact)
trigger3 = stateno = 410 && (movecontact)
trigger4 = stateno = 100

[State -1, Crouching High Kick]
type = ChangeState
value = 450
triggerall = command = "c"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 440 && (movecontact)
trigger3 = stateno = 430 && (movecontact)
trigger4 = stateno = 420 && (movecontact)
trigger5 = stateno = 100




;---------------------------------------------------------------------------


;----------------------------------------------------------------------


;======================================================================

;-------------------------------------------------------------------
;-------------------------------------------------------------------------------


; Air Light claw
[State -1, Air Light claw]
type = ChangeState
value = 600
triggerall = (command = "x") && (statetype = A)
triggerall = command = "holdback"
trigger1 = ctrl = 1

;---------------------------------------------------------------------------

; Air Light Punch 
[State -1, Air Light Punch]
type = ChangeState
value = 605
triggerall = (command = "x") && (statetype = A)
triggerall = command != "holdback"
trigger1 = ctrl = 1

;---------------------------------------------------------------------------

; Air Medium Punch
[State -1, Air Medium Punch]
type = ChangeState
value = 610
triggerall = (command = "y") && (statetype = A)
trigger1 = ctrl = 1
trigger2 = stateno = 605 && (movecontact)


;---------------------------------------------------------------------------
; Air Hard Punch
[State -1, Air Hard Punch]
type = ChangeState
value = 620
triggerall = (command = "z") && (statetype = A)
trigger1 = ctrl = 1
trigger2 = stateno = 610 && (movecontact)
trigger3 = stateno = 605 && (movecontact)


;---------------------------------------------------------------------------
; Air Light Kick
[State -1, Air Light Kick]
type = ChangeState
value = 630
triggerall = (command = "a") && (statetype = A)
trigger1 = ctrl = 1
trigger2 = stateno = 605 && (movecontact)

;---------------------------------------------------------------------------
; Air Medium Kick
[State -1, Air Medium Kick]
type = ChangeState
value = 640
triggerall = (command = "b") && (statetype = A)
trigger1 = ctrl = 1
trigger2 = stateno = 630 && (movecontact)
trigger3 = stateno = 610 && (movecontact)

;---------------------------------------------------------------------------
; Air Hard Kick
[State -1, Air Hard Kick]
type = ChangeState
value = 650
triggerall = (command = "c") && (statetype = A)
trigger1 = ctrl = 1
trigger2 = stateno = 640 && (movecontact)
trigger3 = stateno = 630 && (movecontact)
trigger4 = stateno = 620 && (movecontact)



;-----------------------------------------------------------------------------------------
;--------------------------------------------------------------------------------------


;-----------------------------------------------------------------------------------------
;--------------------------------------------------------------------------------------
; Kyosuke - AI MOVEMENTS
;-----------------------------------------------------------------------------------------
;-------------------------------------------------------------------------------------



[State -1, AI 3 random objects]
type = ChangeState
value = 2400
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500

[State -1, AI table]
type = ChangeState
value = 2200
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500

[State -1, AI music]
type = ChangeState
value = 2210
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500

[State -1, AI basket]
type = ChangeState
value = 2220
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500

[State -1, AI crazy rubber]
type = ChangeState
value = 12200
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500

[State -1, AI random falling item]
type = ChangeState
value = 12700
triggerall= var(0)
triggerall = helper(1400), stateno = 1500
triggerall= roundstate=2 && statetype=S && stateno!=100 && ctrl
triggerall= p2statetype!=A && p2statetype!=L && p2movetype!=H
trigger1= (p2bodydist x=[20,220]) && (p2bodydist y=[-25,25]) && random<250
trigger2= (p2stateno!=[120,155]) && (p2bodydist x=[20,86]) && (p2bodydist y=[-25,25]) && random<500



;AI ---------------------------------------------------------------------------
;===========================================================================
; Guarding when cornered
; ==========================
; AI Standing Guard
; ==========================
[State -1]
type = ChangeState
triggerall = var(0)
triggerall = Statetype != A ;Player is not in the air
triggerall = P2statetype != C ;Player is not crouching
triggerall = Statetype = S ;Player is currently standing
triggerall = P2Movetype = A ;Opponent is attacking
triggerall = Pos Y != [-1,-999]
triggerall = p2bodydist X<80
triggerall = enemy,hitdefattr = SCA,AA,AP
triggerall = (random <= 800) || var(7)
trigger1 = ctrl
trigger2 = stateno = 102
trigger3 = stateno = [21,22]
value = 130 ;Default standing guard state

; =============================
; AI Stand to Crouch Guard Transition
; =============================
[State -1]
type = ChangeState
triggerall = var(0)
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
trigger1 = stateno = 150
trigger1 = 1
value = 152

; =============================
; AI Crouching Guard
; =============================
[State -1]
type = ChangeState
triggerall = var(0)
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
triggerall = p2bodydist X<80
triggerall = enemy,hitdefattr = SCA,AA,AP
triggerall = (random <= 800) || var(7)
trigger1 = ctrl
trigger2 = stateno = 102
trigger3 = stateno = [21,22]
value = 131

; =============================
; AI Crouch to Stand Guard Transition
; =============================
[State -1]
type = ChangeState
triggerall = var(0)
triggerall = Statetype != A
triggerall = P2statetype != C
triggerall = P2Movetype = A
trigger1 = 1
trigger1 = stateno = 152
value = 150

; =============================
; AI Aerial Guard
; =============================
[State -1]
type = ChangeState
triggerall = var(0)
triggerall = Statetype = A
triggerall = P2Movetype = A
triggerall = p2bodydist X<80
triggerall = enemy,hitdefattr = SCA,AA,AP
triggerall = ctrl = 1
trigger1 = (random <= 800) || var(7)
value = 132


; Kung Fu Blow walk/run

[State -1, AI Walk Special]
type = ChangeState
value = 21
triggerall = var(0)
triggerall = statetype = S
triggerall = ctrl
trigger1 = p2stateno = [1027,1028]
trigger1 = p2movetype = H
trigger1 = p2dist X <=150

[State -1, AI Run Special]
type = ChangeState
value = 100
triggerall = var(0)
triggerall = statetype = S
trigger1 = ctrl
trigger1 = p2stateno = [1027,1028]
trigger1 = p2movetype = H
trigger1 = p2dist X>150

;---------------------------------------------------------------------------
[State -1, AI Jump]
type = ChangeState
value = 40
triggerall = var(0)
triggerall = ctrl || stateno = 102
triggerall = p2movetype != H
triggerall = stateno != [40,55]
triggerall = statetype = S
triggerall = p2stateno != 1028
trigger1 = p2dist X = [110,120]
trigger1 = stateno != [100,102]
trigger1 = random>800
trigger2 = p2dist X = [120,140]
trigger2 = stateno = [100,102]
trigger2 = random>800
trigger3 = enemy,numproj>0
trigger3 = p2dist X = [80,360]
trigger4 = p2movetype = A
trigger4 = enemy,hitdefattr = SCA,HT
;trigger4 = p2dist X = [0,100]
trigger4 = enemy,vel X>0

[State -1, AI Run Back]
type = ChangeState
value = 105
triggerall = !win
triggerall = var(0)
triggerall = ctrl
triggerall = stateno != [100,105]
triggerall = stateno != [40,55]
triggerall = statetype = S
trigger1 = p2dist X<=80
trigger1 = p2stateno = [5100,5110]
trigger1 = backedgebodydist>20

;--------------------------------------
[State -1, AI Stand Light Punch2]
type = ChangeState
value = 201
triggerall = var(0)
triggerall = statetype = S
triggerall = ctrl
trigger1 = prevstateno = 1056
trigger1 = enemy,backedgebodydist<=20
trigger1 = p2movetype = H
trigger1 = p2stateno != [120,170]
trigger1 = p2stateno = [5030,5100]
trigger2 = p2stateno != [5100,5150]
trigger2 = p2dist X<50
trigger2 = p2statetype = S
trigger2 = random>900
trigger3 = prevstateno = [810,811]
trigger3 = p2bodydist X = [0,15]
trigger3 = enemy,backedgebodydist<=20
trigger4 = p2stateno = 821
trigger4 = p2bodydist X = [0,20]
;--------------------------------------
[State -1, AI Stand Light Punch]
type = ChangeState
value = 200
triggerall = var(0)
triggerall = statetype = S
triggerall = ctrl
trigger1 = prevstateno = 1056
trigger1 = enemy,backedgebodydist<=20
trigger1 = p2movetype = H
trigger1 = p2stateno != [120,170]
trigger1 = p2stateno = [5030,5100]
trigger2 = p2stateno != [5100,5150]
trigger2 = p2dist X<50
trigger2 = p2statetype = S
trigger2 = random>900
trigger3 = prevstateno = [810,811]
trigger3 = p2bodydist X = [0,15]
trigger3 = enemy,backedgebodydist<=20
trigger4 = p2stateno = 821
trigger4 = p2bodydist X = [0,20]

[State -1, AI Stand Medium Punch]
type = ChangeState
value = 210
triggerall = var(0)
triggerall = statetype = S
trigger1 = stateno = 200
trigger1 = p2stateno = [5030,5100]
trigger1 = enemy,backedgebodydist<=20
trigger1 = time > 5
trigger1 = movehit
trigger2 = p2stateno != [5100,5150]
trigger2 = p2stateno != 1028
trigger2 = p2dist X<60
trigger2 = ctrl
trigger2 = random>980




[State -1, AI Stand Strong Punch]
type = ChangeState
value = 220
triggerall = var(0)
triggerall = statetype = S
trigger1 = (stateno = 200) && time > 7
trigger1 = movehit
trigger1 = p2dist X = [0,69]
trigger2 = p2stateno != [5100,5150]
trigger2 = p2stateno != 1028
trigger2 = ctrl
trigger2 = statetype = S
trigger2 = p2dist X = [0,69]
trigger2 = random>800


[State -1, AI Standing Light Kick]
type = ChangeState
value = 230
triggerall = var(0)
triggerall = statetype = S
trigger1 = (stateno = 230) && time > 6
trigger1 = movehit
trigger1 = p2dist X = [0,65]

;--------------------------------------
[State -1, AI Standing Light Kick2]
type = ChangeState
value = 231
triggerall = var(0)
triggerall = statetype = S
trigger1 = (stateno = 230) && time > 6
trigger1 = movehit
trigger1 = p2dist X = [0,65]
;--------------------------------------
[State -1, AI Standing Medium Kick]
type = ChangeState
value = 240
triggerall = var(0)
triggerall = statetype = S
trigger1 = (stateno = 240) && time > 6
trigger1 = movehit
trigger1 = p2dist X = [0,65]

[State -1, AI Standing Strong Kick]
type = ChangeState
value = 250
triggerall = var(0)
triggerall = statetype = S
trigger1 = (stateno = 250) && time > 6
trigger1 = movehit
trigger1 = p2dist X = [0,65]


[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = var(0)
trigger1 = statetype = C
trigger1 = ctrl
trigger1 = p2dist X<40


[State -1, Crouching Medium Punch]
type = ChangeState
value = 410
triggerall = var(0)
trigger1 = statetype = C
trigger1 = ctrl
trigger1 = p2dist X<50

[State -1, Crouching Strong Punch]
type = ChangeState
value = 420
triggerall = var(0)
trigger1 = p2dist X = [0,65]
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)


[State -1, AI Crouching Light Kick]
type = ChangeState
value = 430
triggerall = var(0)
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = p2bodydist X<=55
trigger1 = p2statetype = S
trigger1 = p2stateno = [200,250]
trigger1 = p2movetype = A

[State -1, AI Crouching Medium Kick]
type = ChangeState
value = 440
triggerall = var(0)
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = p2bodydist X<=65
trigger1 = p2statetype = S
trigger1 = p2stateno = [200,250]
trigger1 = p2movetype = A

[State -1, AI Crouching Strongt Kick]
type = ChangeState
value = 450
triggerall = var(0)
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = p2bodydist X<=75
trigger1 = p2statetype = S
trigger1 = p2stateno = [200,250]
trigger1 = p2movetype = A

;---------------------------------------------------------------------------
[State -1, AI Jump Light claw]
type = ChangeState
value = 600
triggerall = var(0)
trigger1 = stateno = 600
trigger1 = statetime >= 7
trigger1 = movecontact
trigger1 = p2dist X-(vel X*7)<=40
trigger1 = prevstateno != 600
trigger2 = stateno != 600
trigger2 = statetype = A
trigger2 = ctrl
trigger2 = p2bodydist X<=30
trigger2 = p2statetype = A
trigger2 = p2dist Y = [-60,10]
;--------------------------------------
[State -1, AI Jump Light punch]
type = ChangeState
value = 605
triggerall = var(0)
trigger1 = stateno = 605
trigger1 = statetime >= 7
trigger1 = movecontact
trigger1 = p2dist X-(vel X*7)<=40
trigger1 = prevstateno != 600
trigger2 = stateno != 600
trigger2 = statetype = A
trigger2 = ctrl
trigger2 = p2bodydist X<=30
trigger2 = p2statetype = A
trigger2 = p2dist Y = [-60,10]
;--------------------------------------

[State -1, AI Jump Medium Punch]
type = ChangeState
value = 610
triggerall = var(0)
trigger1 = stateno = 610
trigger1 = statetime >= 7
trigger1 = movecontact
trigger1 = p2dist X-(vel X*7)<=40
trigger1 = prevstateno != 610
trigger2 = stateno != 610
trigger2 = statetype = A
trigger2 = ctrl
trigger2 = p2bodydist X<=30
trigger2 = p2statetype = A
trigger2 = p2dist Y = [-60,10]


[State -1, AI Jump Strong Punch]
type = ChangeState
value = 620
triggerall = var(0)
trigger1 = stateno = 620
trigger1 = statetime >= 7
trigger1 = movecontact
trigger1 = p2dist X-(vel X*7)<=40
trigger1 = prevstateno != 620
trigger2 = stateno != 620
trigger2 = statetype = A
trigger2 = ctrl
trigger2 = p2bodydist X<=30
trigger2 = p2statetype = A
trigger2 = p2dist Y = [-60,10]

[State -1, AI Jump Light Kick]
type = ChangeState
value = 630
triggerall = var(0)
triggerall = p2dist Y>20
triggerall = p2dist X = [0,40]
triggerall = statetype = A
trigger1 = p2statetype = S
trigger1 = vel Y>0
trigger1 = ctrl
trigger2 = vel Y>0
trigger2 = command = "a"
trigger2 = ctrl

[State -1, AI Jump Medium Kick]
type = ChangeState
value = 640
triggerall = var(0)
trigger1 = statetype = A
trigger1 = ctrl
trigger1 = p2statetype = C
trigger1 = vel Y>0
trigger1 = pos Y>-60
trigger1 = p2dist X<80
trigger2 = stateno = 630 ;jump_x or jump_a
trigger2 = movecontact


[State -1, AI Jump Strong Kick]
type = ChangeState
value = 650
triggerall = var(0)
trigger1 = statetype = A
trigger1 = ctrl
trigger1 = p2statetype = C
trigger1 = vel Y>0
trigger1 = pos Y>-60
trigger1 = p2dist X<80
trigger2 = stateno = 630 ;jump_x or jump_a
trigger2 = movecontact

;---------------------------------------------------------------------------


