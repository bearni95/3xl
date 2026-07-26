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
;   time = time (optional -- defaults to 15 if omitted)
;
; - some_name
;   A name to give that command. You'll use this name to refer to
;   that command in the state entry, as well as the CNS. It is case-
;   sensitive (QCB_a is NOT the same as Qcb_a or QCB_A).
;
; - command
;   list of buttons or directions, separated by commas.
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
;   You can combine them:
;     eg. command = ~30$D, a+b     ;hold D, DB or DF for 30 ticks, release,
;                                  ;then press a and b together
;   It's recommended that for most "motion" commads, eg. quarter-circle-fwd,
;   you start off with a "release direction". This matches the way most
;   popular fighting games implement their command detection.
;
; - time (optional)
;   Time allowed to do the command, given in game-ticks. Defaults to 15
;   if omitted
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
; 
;==================================================================================
;======| RELACIONADO À AI - AI RELATED |===========================================
;==================================================================================

; These 11 Single Button and Hold Dir commands must be placed here at the top
; of the CMD, above all other commands, and in the standard order shown here,
; in order for the "Compatibly Partnered" version (9742) of the helper AI
; activation method to work with different partners in simul team mode.
; (When the partner is not compatible, then it's best to just use the regular
; version (9741) and rely on the XOR method for backup in case a human
; partner's input turns off the CPU partner's AI.)
; (Now, even if you do not intend to give your character any custom AI, it
; would still be nice if you would place the commands at the top of your CMD,
; for the sake of other characters which do use this AI activation method.
; And then, define Anim 9741 in your AIR file to indicate to other characters
; that your character is compatible.
; It may slightly increase the chances of faulty AI activation if the user is
; using characters with a poor implementation of the old humanly-impossible
; commands AI activation method when fighting against your character, but
; other than that, there's really no particular reason not to.  And you can
; change the names of the commands if you want.  For compatibility, all that
; really matters is the "command" and "time" parameters.)
;
; Another important point to make, is that if you want to add additional
; definitions for any of these basic command names, then there are limits on
; what kind of parameters you can use, in order to ensure the reliability of
; the helper method.  That is, if you redefine any of these first 11 commands,
; then you must follow these rules when doing so:
; - Don't use any command string that includes any tildes. (e.g. no "~x",
;   no "~30D")
; - In the command string, don't include any direction that isn't preceeded by
;   a slash. (e.g. no "F", no "$D")
; - Don't put any non-slashed buttons in a command string overloading one of
;   the Hold Dir command names.
; - Using a command string that includes any commas (e.g. no "a,b"), and/or
;   setting the time parameter to greater than 1, may be safe, but I wouldn't
;   risk it.
; An example of what is permissible, is redefining the "z" button like so:
;	[Command]
;	name = "z"
;	command = y+b
;	time = 1
; Other than that particular common type of redefinition, it's probably best
; to simply avoid adding definitions for these 11 command names altogether.
; And remember, this paragraph just has to do with the helper method.  You'll
; still need to make changes to the XOR code, no matter what type of overloading
; you use with the commands used by it.
;
;===================< BUTTON REMAPPING >===================

[Remap]
x = x
y = y
z = z
a = a
b = b
c = c
s = s


;===================< DEFAULT VALUES >===================

[Defaults]
command.time = 15
command.buffer.time = 1


;-| Super Motions |--------------------------------------------------------

;FINAL KAMEHAMEHA
[command]
name = "finalkamehameha"
command = ~D,DF,F,c+z
time=15
[command]
name = "finalkamehameha"
command = ~D,DF,F,~c+z
time=15

;CHO KAMEHAMEHA
[command]
name="chokamehameha"
command = ~F,D,DF,x+y
time=15
[command]
name="chokamehameha"
command = ~F,D,DF,y+z
time=15
[command]
name="chokamehameha"
command = ~F,D,DF,z+x
time=15

;KAMEHAMEHA
[Command]
name = "kamehameha"
command = ~D,DF,F,x+y
time = 15
[Command]
name = "kamehameha"
command = ~D,DF,F,y+z
time = 15
[Command]
name = "kamehameha"
command = ~D,DF,F,z+x
time = 15
[Command]
name = "kamehameha"
command = ~D,DF,F,~x+y
time = 15
[Command]
name = "kamehameha"
command = ~D,DF,F,~y+z
time = 15
[Command]
name = "kamehameha"
command = ~D,DF,F,~z+x
time = 15

;bigbang attack
[command]
name = "bigbangattack"
command = ~D,DB,B,x+y
time=15
[command]
name = "bigbangattack"
command = ~D,DB,B,y+z
time=15
[command]
name = "bigbangattack"
command = ~D,DB,B,z+x
time=15
[command]
name = "bigbangattack"
command = ~D,DB,B,~x+y
time=15
[command]
name = "bigbangattack"
command = ~D,DB,B,~y+z
time=15
[command]
name = "bigbangattack"
command = ~D,DB,B,~z+x
time=15
;-| Special Motions |------------------------------------------------------
[Command]
name = "kiblast"
command = ~D, DF, F, x
time = 15
[Command]
name = "kiblast"
command = ~D, DF, F, y
time = 15
[Command]
name = "kiblast"
command = ~D, DF, F, z
time = 15
[Command]
name = "kiblast"
command = ~D, DF, F, ~x
time = 15
[Command]
name = "kiblast"
command = ~D, DF, F, ~y
time = 15
[Command]
name = "kiblast"
command = ~D, DF, F, ~z
time = 15

[Command]
name = "kipush"
command = ~B,D,F,x
time=15
[Command]
name = "kipush"
command = ~B,D,F,y
time=15
[Command]
name = "kipush"
command = ~B,D,F,z
time=15
[Command]
name = "kipush"
command = ~B,BD,D,DF,F,x
time=15
[Command]
name = "kipush"
command = ~B,BD,D,DF,F,y
time=15
[Command]
name = "kipush"
command = ~B,BD,D,DF,F,z
time=15

;force barrier
[Command]
name = "barrier"
command = ~F, D, DF, x
time = 15
[Command]
name = "barrier"
command = ~F, D, DF, y
time = 15
[Command]
name = "barrier"
command = ~F, D, DF, z
time = 15

;specialbeam
[command]
name = "beam"
command = ~D,DB,B,x
time=15
[command]
name = "beam"
command = ~D,DB,B,y
time=15

[command]
name = "beam"
command = ~D,DB,B,z
time=15


;tackle
[command]
name = "tackle"
command = ~D,DF,F,a
time=15
[command]
name = "tackle"
command = ~D,DF,F,b
time=15
[command]
name = "tackle2"
command = ~D,DF,F,c
time=15

[command]
name = "kyaku"
command = ~D,DB,B,a
time=15
[command]
name = "kyaku"
command = ~D,DB,B,b
time=15
[command]
name = "kyaku"
command = ~D,DB,B,c
time=15
;===================< SINGLE BUTTON >===================

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

[Command]
name = "2p"
command = x+y
time = 5
[Command]
name = "2p"
command = x+z
time = 5
[Command]
name = "2p"
command = y+z
time = 5
[Command]
name = "2k"
command = a+b
time = 5
[Command]
name = "2k"
command = b+c
time = 5
[Command]
name = "2k"
command = c+a
time = 5

;===================< HOLD DIR >===================

[Command]
name = "holdfwd"
command = /$F
time = 1
[Command]
name = "holdback"
command = /$B
time = 1
[Command]
name = "holdup"
command = /$U
time = 1
[Command]
name = "holddown"
command = /$D
time = 1


;===================< HOLD BUTTON >===================

[Command]
name = "holda"
command = /a
time = 1
[Command]
name = "holdb"
command = /b
time = 1
[Command]
name = "holdc"
command = /c
time = 1
[Command]
name = "holdx"
command = /x
time = 1
[Command]
name = "holdy"
command = /y
time = 1
[Command]
name = "holdz"
command = /z
time = 1
[Command]
name = "holdstart"
command = /s
time = 1


;===================< RELEASE BUTTON >===================

[Command]
name = "rlsa"
command = ~a
time = 1
[Command]
name = "rlsb"
command = ~b
time = 1
[Command]
name = "rlsc"
command = ~c
time = 1
[Command]
name = "rlsx"
command = ~x
time = 1
[Command]
name = "rlsy"
command = ~y
time = 1
[Command]
name = "rlsz"
command = ~z
time = 1


;===================< DIR >===================

[Command]
name = "fwd"
command = F
time = 1
[Command]
name = "back"
command = B
time = 1
[Command]
name = "up"
command = U
time = 1
[Command]
name = "down"
command = D
time = 1

[Command]
name = "roll"
command = a+x
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

;-| Hold Button |----------------------------------------------------------
; Please define Anim 74140108 in your AIR file if AND ONLY IF you place these
; 7 Hold Button commands immediately after the 11 Single Button and Hold Dir
; commands at the very top of your CMD list, as demonstrated here.
; In this version of the AI code, these commands are only used by the XOR
; method, and thus are optional.  But there remains a possibility that a
; future version of the helper method might be helped by having these
; commands placed here, and Anim 74140108 would then be used to indicate
; that a partner character has a compatible CMD.

[Command]
name = "holda"
command = /a
time = 1

[Command]
name = "holdb"
command = /b
time = 1

[Command]
name = "holdc"
command = /c
time = 1

[Command]
name = "holdx"
command = /x
time = 1

[Command]
name = "holdy"
command = /y
time = 1

[Command]
name = "holdz"
command = /z
time = 1

[Command]
name = "holdstart"
command = /s
time = 1

;-| CPU |--------------------------------------------------------------
; Note that if you make any changes to the basic one-button or recovery
; commands, you'll need to make the same changes to their matching commands here
; and/or in the XOR VarSet controller.  That includes things like, for example:
;  * changing the recovery command to use a different combination of buttons.
;  * renaming the b button command as "d", or the start button command as "s".
;  * switching the button names around, e.g. so button y triggers "a" and button a triggers "y".
;  * having more than one way to trigger the same command name.
; If you understand how the XOR method works, the proper changes should be obvious.
; If you don't understand it, then simply disable the lines in the XOR VarSet
; controller that correspond to the commands you've altered.

[Command]
name = "a2"
command = a
time = 1

[Command]
name = "b2"
command = b
time = 1

[Command]
name = "c2"
command = c
time = 1

[Command]
name = "x2"
command = x
time = 1

[Command]
name = "y2"
command = y
time = 1

[Command]
name = "z2"
command = z
time = 1

[Command]
name = "start2"
command = s
time = 1

[Command]
name = "holdfwd2"
command = /$F
time = 1

[Command]
name = "holdback2"
command = /$B
time = 1

[Command]
name = "holdup2"
command = /$U
time = 1

[Command]
name = "holddown2"
command = /$D
time = 1

[Command]
name = "holda2"
command = /a
time = 1

[Command]
name = "holdb2"
command = /b
time = 1

[Command]
name = "holdc2"
command = /c
time = 1

[Command]
name = "holdx2"
command = /x
time = 1

[Command]
name = "holdy2"
command = /y
time = 1

[Command]
name = "holdz2"
command = /z
time = 1

[Command]
name = "holdstart2"
command = /s
time = 1

[Command]
name = "recovery2"
command = x+y
time = 1

[command]
name = "powercharge"
command = y+b
time=1

; Here add matching commands for any moves that must never be used randomly
; by the computer, such as suicide moves and super moves, and add the pairs
; to the XOR VarSet controller in State -3.

; If you're desperate to make sure that the AI always gets turned on as soon
; as possible, you can add more equivalents for your own commands here too,
; and add to the XOR VarSet controller's triggers accordingly.  You should
; use button-only commands before using any commands with directional
; components, as the latter apparently doesn't work in Linux Mugen 2002.04.14.

; And of course, if you've run out of unique command labels (Mugen allows
; 128), you can remove as many of these as you want.  You'll of course need
; to modify the XOR VarSet controller's triggers accordingly, but Mugen
; will let you know if you forget to do so. :)


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
command = D, U
time = 18

[Command]
name = "DU"
command = DB, UF
time = 18

[Command]
name = "DU"
command = DF, UB
time = 18

[Command]
name = "DU"
command = $D, UF
time = 18

[Command]
name = "DU"
command = $D, UB
time = 18

;===================< OTHER >===================

[Command]
name = "highjump"
command = $D, $U
time = 15


;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery" ;Required (do not remove)
command = x+y
time = 1

[Command]
name = "recovery"
command = y+z
time = 1

[Command]
name = "recovery"
command = x+z
time = 1

[Command]
name = "recovery"
command = a+b
time = 1

[Command]
name = "recovery"
command = b+c
time = 1

[Command]
name = "recovery"
command = a+c
time = 1


[Command]
name = "recovery"
command = x+y
time = 1
[Command]
name = "recovery"
command = x+z
time = 1
[Command]
name = "recovery"
command = y+z
time = 1
[Command]
name = "recovery"
command = a+x
time = 1

[Command]
name = "recoverR"
command = ~D,DF,F
time = 14
[Command]
name = "recoverR"
command = ~D,DB,B
time = 14



[Command]
name = "2p"
command = x+y
time = 1
[Command]
name = "2p"
command = x+z
time = 1
[Command]
name = "2p"
command = y+z
time = 1

[Command]
name = "2k"
command = a+b
time = 1
[Command]
name = "2k"
command = a+c
time = 1
[Command]
name = "2k"
command = b+c
time = 1

[Command]
name = "excelcombo"
command = c+z
time = 1

[Command]
name = "roll"
command = a+x
time = 1

;===================< SINGLE BUTTON >===================

[Command]
name = "a"
command = a
time = 4
[Command]
name = "b"
command = b
time = 4
[Command]
name = "c"
command = c
time = 4
[Command]
name = "x"
command = x
time = 4
[Command]
name = "y"
command = y
time = 4
[Command]
name = "z"
command = z
time = 4
[Command]
name = "start"
command = s
time = 4

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "back_x"
command = /$B,x
time = 1

[Command]
name = "back_y"
command = /$B,y
time = 1

[Command]
name = "back_z"
command = /$B,z
time = 1

[Command]
name = "down_x"
command = /$D,x
time = 1

[Command]
name = "down_y"
command = /$D,y
time = 1

[Command]
name = "down_z"
command = /$D,z
time = 1

[Command]
name = "fwd_x"
command = /$F,x
time = 1

[Command]
name = "fwd_y"
command = /$F,y
time = 1

[Command]
name = "fwd_z"
command = /$F,z
time = 1

[Command]
name = "up_x"
command = /$U,x
time = 1

[Command]
name = "up_y"
command = /$U,y
time = 1

[Command]
name = "up_z"
command = /$U,z
time = 1

[Command]
name = "back_a"
command = /$B,a
time = 1

[Command]
name = "back_b"
command = /$B,b
time = 1

[Command]
name = "back_c"
command = /$B,c
time = 1

[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

[Command]
name = "down_c"
command = /$D,c
time = 1

[Command]
name = "fwd_a"
command = /$F,a
time = 1

[Command]
name = "fwd_b"
command = /$F,b
time = 1

[Command]
name = "fwd_c"
command = /$F,c
time = 1

[Command]
name = "up_a"
command = /$U,a
time = 1

[Command]
name = "up_b"
command = /$U,b
time = 1

[Command]
name = "up_c"
command = /$U,c
time = 1



;==================================================================================
;======| RELACIONADO À AI - AI RELATED |===========================================
;==================================================================================
[Statedef -1]

[State -1, Tick Fix]
type = ctrlset
triggerall = !ctrl
trigger1 = (stateno = 52 || stateno = 105 || stateno = 5120) && !animtime
trigger2 = (stateno = [200, 259]) && !animtime
trigger3 = ((stateno = [700, 701]) || (stateno = [710, 729]) || stateno = 760) && !animtime
trigger4 = (stateno = 5001 || stateno = 5011 || stateno = 151 || stateno = 153) && hitover
value = 1


;;---------------------------------------------------------------------------
[State -1, FINAL Kamehameha]
type = changestate
value = 3200
triggerall = !AIlevel&&command = "finalkamehameha"&&roundstate = 2 && statetype != A && power >= 3000
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact
;;---------------------------------------------------------------------------
[State -1, CHO Kamehameha]
type = changestate
value = 3100
triggerall = !AIlevel&&command = "chokamehameha"&&roundstate = 2 && statetype != A && power >= 2000
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;---------------------------------------------------------------------------
[State -1,]
type = changestate
value = 3001
triggerall = !AIlevel&&command = "bigbangattack"&&roundstate = 2 && statetype != A && power >= 1000
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;---------------------------------------------------------------------------
[State -1, Kamehameha]
type = changestate
value = 3000
triggerall = !AIlevel&&command = "kamehameha"&&roundstate = 2 && statetype != A && power >= 1000
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;----------------------------------------------------------------------------
[State -1, ]
type=ChangeState
value=1302
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = command="tackle2"
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;----------------------------------------------------------------------------
[State -1, ]
type=ChangeState
value=1300
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = command="tackle"
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;----------------------------------------------------------------------------
[State -1, ]
type=ChangeState
value=1200
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = command="beam"
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;----------------------------------------------------------------------------
[State -1, Kohou]
type=ChangeState
value=1101
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = command="barrier"
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;-----------------------------------------------------------------------------------------
[State -1, Ki push]
type=ChangeState
value=1010
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = !AIlevel&&command = "kipush"&&roundstate = 2 && statetype != A 
triggerall = !numhelper(1011)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact
;-----------------------------------------------------------------------------------------
[State -1, Ki push]
type=ChangeState
value=1000
triggerall=!AILevel && RoundState=2 && StateType != A 
triggerall = !AIlevel&&command = "kiblast"&&roundstate = 2 && statetype != A 
triggerall = !numhelper(1005)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;===========================================================================
;[State -1, throw]
;type = changestate
;value = 800
;trigger1 = !AIlevel
;trigger1 = (command = "recovery" || command = "2k") && command="holdfwd";(command = "holdfwd" || command = "holdback")
;trigger1 = roundstate = 2 && ctrl && statetype = S && stateno != 100

[State -1, roll combo]
type = changestate
value = 710
triggerall = !AIlevel
triggerall = command = "roll" && command = "holdback"
triggerall = roundstate = 2 && statetype != A && var(20)
trigger1 = var(20) && (stateno = [200, 289]) && movecontact
trigger2 = var(20) && (stateno = [1000, 2999]) && statetype != A && movecontact
trigger3 = var(20) && (stateno = [1000, 2999]) && statetype != A && numhelper(stateno + 5)
trigger3 = helper(stateno + 5), var(3)

[State -1, roll / dodge]
type = changestate
value = 720;ifelse(command = "holdfwd", 720, 710)
triggerall = !AIlevel && roundstate = 2 && statetype != A
triggerall = command = "roll"
trigger1 = ctrl

;----------------------------------------------------------------------
[State -1, powercharge]
type = changestate
value = 990
trigger1 = !AIlevel
trigger1 = command = "holdb" && command = "holdy"
trigger1 = roundstate = 2 && statetype != A && ctrl
trigger1 = power < const(data.power) && power < powermax ;&& !var(20)
;---------------------------------------------------------------------------
; Stand Light Punch
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "x"
trigger1 = ctrl
trigger2 = stateno = [100,101]

;---------------------------------------------------------------------------
; Stand Medium Punch
[State -1, Stand Medium Punch]
type = ChangeState
value = 210
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "y"
trigger1 = ctrl
trigger2 = (stateno = [200,209])&& movecontact
trigger3 = (stateno = [230,239])&& movecontact
trigger4 = (stateno = [400,409])&& movecontact
trigger5 = (stateno = [430,439])&& movecontact
trigger6 = stateno = [100,101]

;---------------------------------------------------------------------------
; Stand Strong Punch
[State -1, Stand Strong Punch]
type = ChangeState
value = 220
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "z"
trigger1 = ctrl
trigger2 = (stateno = [200,219])&& movecontact
trigger3 = (stateno = [230,249])&& movecontact
trigger4 = (stateno = [400,419])&& movecontact
trigger5 = (stateno = [430,449])&& movecontact
trigger6 = stateno = [100,101]

;---------------------------------------------------------------------------
; Stand Light Kick
[State -1, Stand Light Kick]
type = ChangeState
value = 230
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "a"
trigger1 = ctrl
trigger2 = (stateno = [200,209])&& movecontact
trigger3 = (stateno = [400,409])&& movecontact
trigger4 = stateno = [100,101]

;---------------------------------------------------------------------------
; Standing Medium Kick
[State -1, Standing Medium Kick]
type = ChangeState
value = 240
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "b"
trigger1 = ctrl
trigger2 = (stateno = [200,219])&& movecontact
trigger3 = (stateno = [230,239])&& movecontact
trigger4 = (stateno = [400,419])&& movecontact
trigger5 = (stateno = [430,439])&& movecontact
trigger6 = stateno = [100,101]

;---------------------------------------------------------------------------
; Standing Strong Kick
[State -1, Standing Strong Kick]
type = ChangeState
value = 250;+(5*(p2bodydist x<35))
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command != "holddown"&& command = "c"
trigger1 = ctrl
trigger2 = (stateno = [200,249])&& movecontact
trigger3 = (stateno = [400,449])&& movecontact
trigger4 = stateno = [100,101]

;---------------------------------------------------------------------------
;Crouching Low Punch
[State -1, Crouching Low Punch]
type = ChangeState
value = 400
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command = "holddown"&& command = "x"
trigger1 = ctrl
trigger2 = stateno = [100,101]
;---------------------------------------------------------------------------
;Crouching Medium Punch
[State -1, Crouching Medium Punch]
type = ChangeState
value = 410
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command= "holddown"&& command = "y"
trigger1 = ctrl
trigger2 = (stateno = [200,209])&& movecontact
trigger3 = (stateno = [230,239])&& movecontact
trigger4 = (stateno = [400,409])&& movecontact
trigger5 = (stateno = [430,439])&& movecontact
trigger6 = stateno = [100,101]
;---------------------------------------------------------------------------
;Crouching High Punch
[State -1, Crouching High Punch]
type = ChangeState
value = 420
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command = "holddown"&& command = "z"
trigger1 = ctrl
trigger2 = (stateno = [200,219])&& movecontact
trigger3 = (stateno = [230,249])&& movecontact
trigger4 = (stateno = [400,419])&& movecontact
trigger5 = (stateno = [430,449])&& movecontact
trigger6 = stateno = [100,101]
;---------------------------------------------------------------------------
;Crouching Low Kick
[State -1, Crouching Low Kick]
type = ChangeState
value = 430
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command = "holddown"&& command = "a"
trigger1 = ctrl
trigger2 = (stateno = [200,209])&& movecontact
trigger3 = (stateno = [400,409])&& movecontact
trigger4 = stateno = [100,101]
;---------------------------------------------------------------------------
; Crouching Medium Kick
[State -1, Crouching Medium Kick]
type = ChangeState
value = 440
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command = "holddown"&& command = "b"
trigger1 = ctrl
trigger2 = (stateno = [200,219])&& movecontact
trigger3 = (stateno = [230,239])&& movecontact
trigger4 = (stateno = [400,419])&& movecontact
trigger5 = (stateno = [430,439])&& movecontact
trigger6 = stateno = [100,101]
;---------------------------------------------------------------------------
;Crouching High Kick
[State -1, Crouching High Kick]
type = ChangeState
value = 450
triggerall = !AILevel&&Roundstate=2&&statetype != A&&command = "holddown"&& command = "c"
trigger1 = ctrl
trigger2 = (stateno = [200,249])&& movecontact
trigger3 = (stateno = [400,449])&& movecontact
trigger4 = stateno = [100,101]
;---------------------------------------------------------------------------
;Jumping Low Punch
[State -1, Jumping Low Punch]
type = ChangeState
value = 600
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "x"
trigger1 = ctrl
trigger2 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping Medium Punch
[State -1, Jumping Medium Punch]
type = ChangeState
value = 610
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "y"
trigger1 = ctrl
trigger2 = (stateno = [600,609])&& movecontact
trigger3 = (stateno = [630,639])&& movecontact
trigger4 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping High Punch
[State -1, Jumping High Punch]
type = ChangeState
value = 620
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "z"
trigger1 = ctrl
trigger2 = (stateno = [600,619])&& movecontact
trigger3 = (stateno = [630,649])&& movecontact
trigger4 = stateno = [110, 115]
;---------------------------------------------------------------------------
; Jump Light Kick
[State -1, Jump Light Kick]
type = ChangeState
value = 630
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "a"
trigger1 = ctrl
trigger2 = (stateno = [600,609])&& movecontact
trigger3 = stateno = [110, 115]

;---------------------------------------------------------------------------
; Jump Medium Kick
[State -1, Jump Medium Kick]
type = ChangeState
value = 640
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "b"
trigger1 = ctrl
trigger2 = (stateno = [600,619])&& movecontact
trigger3 = (stateno = [630,639])&& movecontact
trigger4 = stateno = [110, 115]

;---------------------------------------------------------------------------
; Jump Strong Kick
[State -1, Jump Strong Kick]
type = ChangeState
value = 650
triggerall = !AILevel&&Roundstate=2&&statetype = A&&command = "c"
trigger1 = ctrl
trigger2 = (stateno = [600,649])&& movecontact
trigger3 = stateno = [110, 115]

;---------------------------------------------------------------------------
[State -1, run / dash]
type = changestate
value = ifelse(command = "FF", 100, 105)
trigger1 = !AIlevel
trigger1 = command = "FF" || command = "BB"
trigger1 = roundstate = 2 && (stateno != [100, 106]) && statetype = S && ctrl

[State -1, Fall Recovery]
type = changestate
value = 5210
trigger1 = !AIlevel && numenemy
trigger1 = roundstate = 2 && alive
trigger1 = Command = "recovery" || Command = "recoverR"
trigger1 = stateno = 5050 && canrecover
trigger1 = vel y > 0 && pos y < -20

[State -1, Fall Recovery]
type = changestate
value = 5200
trigger1 = !AIlevel && numenemy
trigger1 = roundstate = 2 && alive
trigger1 = Command = "recovery" || Command = "recoverR"
trigger1 = stateno = 5050 && gethitvar(fall.recover)
trigger1 = vel y > 0 && pos y >= -20


[State -1, super jump ]
type = ChangeState
value = 123
triggerall = !AIlevel && roundstate=2
trigger1 = command = "DU"
trigger1 = ctrl ; these means that you can make the move when you control the char
trigger1 = statetype != A ; these is to make that you cant use the superjump while you are in the air
; If you want to make a launcher you can use these
trigger2 = (stateno = 420) && (movehit) && (command = "holdup") ;yyy right here is the stateno for your lancher


[State -1] ;Forward Dash
type = ChangeState
value = 110;100000
triggerall = (StateType = A && command = "FF")
trigger1 = StateNo != [100,109]
trigger1 = ctrl

[State -1] ;Back Dash
type = ChangeState
value = 115;100001
triggerall = (StateType = A && command = "BB")
trigger1 = StateNo != [100,109]
trigger1 = ctrl



[State -1, Tick Fix]
type = ctrlset
triggerall = !ctrl
trigger1 = (stateno = 52 || stateno = 105 || stateno = 5120) && !animtime
trigger2 = (stateno = [200, 259]) && !animtime
trigger3 = ((stateno = [700, 701]) || (stateno = [710, 729]) || stateno = 760) && !animtime
trigger4 = (stateno = 5001 || stateno = 5011 || stateno = 151 || stateno = 153) && hitover
value = 1



;===========================================================================
;---------------------------------------------------------------------------
; Taunt
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

[State -1, powercharge]
type = changestate
value = 990
trigger1= AIlevel && numenemy
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax
trigger1= random < (50 * (AIlevel ** 2 / 64.0))&& !inguarddist && p2movetype!=A && p2dist x>=160

;---------------------------------------------------------------------------

[State -1, Fall Recovery]
type = changestate
value = 5210
trigger1 = AIlevel && numenemy
trigger1 = roundstate = 2 && alive
trigger1 = stateno = 5050 && canrecover
trigger1 = vel y > 0 && pos y < -20
trigger1 = random < (25 * (AIlevel ** 2 / 64.0))

[State -1, Fall Recovery]
type = changestate
value = 5200
trigger1 = AIlevel && numenemy
trigger1 = roundstate = 2 && alive
trigger1 = stateno = 5050 && gethitvar(fall.recover)
trigger1 = vel y > 0 && pos y >= -20
trigger1 = random < (100 * (AIlevel ** 2 / 64.0))

[State -1, airrecover]
type=changestate
value=ifelse((pos y>=-20),5200,5210)
triggerall= AILevel && numenemy
triggerall= roundstate=2 && stateno=5050
trigger1= vel y>-1 && alive && canrecover && random < (250 * (AIlevel ** 2 / 64.0))

[State -1, roll / dodge]
type = changestate
value = ifelse(random < (250 * (AIlevel ** 2 / 64.0)), 710, 720)
trigger1 = AIlevel && numenemy
trigger1 = roundstate = 2 && statetype != A
trigger1 = ctrl && random < (50 * (AIlevel ** 2 / 64.0))
trigger1 = (enemynear, movetype = A) && (enemynear, hitdefattr = SCA, AA)
trigger1 = (p2bodydist x = [40, 120]) && (enemynear, animtime <= -28)


[State -1, Jump]
type = changestate
value = 40
trigger1 = AIlevel && numenemy&&random < (150 * (AIlevel ** 2 / 64.0))
trigger1 = roundstate = 2 && statetype != A && ctrl
trigger1 = enemynear, movetype = A && p2bodydist x < 160 && enemynear, hitdefattr = SC, AT

;---------------------------------------------------------------------------
[State -1, roll / dodge]
type = changestate
value = ifelse(random < (250 * (AIlevel ** 2 / 64.0)), 710, 720)
triggerall = AIlevel && numenemy
triggerall = roundstate = 2 && statetype != A
trigger1 = ctrl && random < (50 * (AIlevel ** 2 / 64.0))
triggerall = (enemynear, movetype = A) && (enemynear, hitdefattr = SCA, AA)
triggerall = (p2bodydist x = [40, 120]) && (enemynear, animtime <= -28)
;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
[State -1, run]
type = changestate
value = 100
trigger1 = AIlevel && numenemy
trigger1 = statetype = S && roundstate = 2 && ctrl && random < (200 * (AIlevel ** 2 / 64.0))
trigger1 = (stateno != [100, 105]) && enemynear, movetype != A && p2bodydist x > 120

[State -1, dash]
type = changestate
value = 105
triggerall = AIlevel && numenemy
triggerall = statetype = S && roundstate = 2 && ctrl
triggerall = (p2bodydist x = [0, 80]) && backedgebodydist > 80 && (stateno != [100, 105])
trigger1 = enemynear, movetype = A && random < (50 * (AIlevel ** 2 / 64.0))
trigger2 = enemynear, stateno = 5120 && enemynear, animtime = -3 && random < (200 * (AIlevel ** 2 / 64.0))

[State -1, Jump]
type = changestate
value = 40
trigger1 = AIlevel && numenemy&&random < (150 * (AIlevel ** 2 / 64.0))
trigger1 = roundstate = 2 && statetype != A && ctrl
trigger1 = enemynear, movetype = A && p2bodydist x < 160 && enemynear, hitdefattr = SC, AT

[state -1,AI Guard]
type = ChangeState
value = 120
triggerall = AIlevel && numenemy&& roundstate = 2&&InGuardDist&& random < (900 * (AIlevel ** 2 / 64.0))
triggerall = ctrl
trigger1=!(stateno=[120,155])
trigger1=!(enemynear,hitdefattr=SCA,AT)

[state -1,AI Air Guard]
type = ChangeState
value = 132
triggerall = AIlevel && numenemy&& roundstate = 2&&InGuardDist&& random < (900 * (AIlevel ** 2 / 64.0))
triggerall = ctrl&&statetype = A
trigger1 = enemynear,numproj
trigger2 = enemynear,HitDefAttr = SCA, NA,SA,HA
trigger2 = random <=ifelse(backedgedist<=10,900,700)


[State -1, AI Super Jump 2]
type = ChangeState
value = 123
triggerall = stateno != 100 && pos y = 0&&random < (200 * (AIlevel ** 2 / 64.0))
triggerall = AIlevel && numenemy&& statetype != A && roundstate = 2 && ctrl&&(p2bodydist y = [-300,-70])
trigger1 = enemy,vel y < -1&&(p2bodydist x = [ 20, 50])&&p2movetype != A
trigger2 = enemy,vel y < -1
trigger2 = p2movetype = H && (p2stateno = 5040 || p2stateno = 5200 || p2stateno = 5210)
trigger2 = p2bodydist x <= 30
trigger3 = P2MoveType != H&&P2BodyDist Y < -90&& enemy,vel y <= 0

[State -1, FOLLOW UP]
type = ChangeState
value = 123
triggerall = AIlevel && numenemy&&roundstate = 2&&statetype != A
;trigger1 =ctrl
trigger1 = StateNo = 420 && Movehit
trigger1 = (stateno=420)&&(movehit)
trigger2 = stateno=255&&movehit

;---------------------------------------------------------------------------
; Standing Low Punch
[State -1, Standing Low Punch AI]
type = ChangeState
value = 200
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A
triggerall = p2bodydist x <=55&&(p2bodydist y = [-70,5])&&P2statetype != A&&P2statetype != C&&P2statetype != L&& random < (350 * (AIlevel ** 2 / 64.0))
trigger1 = ctrl
trigger2 = stateno = 100
;---------------------------------------------------------------------------
; Standing Medium Punch
[State -1, Standing Medium Punch AI]
type = ChangeState
value = 210;+(5*(p2bodydist x<25))
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != C&&P2statetype != L
trigger1 = (stateno = [200,209])|| (stateno = [230,239])||(stateno = [400,409])||(stateno = [430,439])&& movehit
trigger1 = random < 250
trigger1 = p2bodydist x <= 40
;---------------------------------------------------------------------------
;Standing High Punch
[State -1, Standing High Punch AI]
type = ChangeState
value = 220;+(5*(p2bodydist x<35))
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != C&&P2statetype != L
trigger1 = (stateno = [210,219])|| (stateno = [240,249])||(stateno = [410,419])||(stateno = [440,449])&& movehit
trigger1 = random < 550
trigger1 = p2bodydist x <= 50
;---------------------------------------------------------------------------
;Standing Low Kick
[State -1, Standing Low Kick AI]
type = ChangeState
value = 230
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != C&&P2statetype != L
trigger1 = (stateno = [200,209])|| (stateno = [400,409])&& movehit
trigger1 = random < 100
;---------------------------------------------------------------------------
;Standing Medium Kick
[State -1, Standing Medium Kick AI]
type = ChangeState
value = 240
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != C&&P2statetype != L
trigger1 = (stateno = [210,219])|| (stateno = [230,239])||(stateno = [410,419])||(stateno = [430,439])&& movehit
trigger1 = random < 250
;---------------------------------------------------------------------------
;Standing High Kick
[State -1, Standing High Kick AI]
type = ChangeState
value = 250;+(5*(p2bodydist x<25))
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != C&&P2statetype != L
trigger1 = (stateno = [240,249])|| (stateno = [440,449])&& movehit 
trigger1 = random < 500
trigger1 = p2bodydist X >= 20
;---------------------------------------------------------------------------
;Crouching Low Punch
[State -1, Crouching Low Punch]
type = ChangeState
value = 400
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A
triggerall = p2bodydist x <=55&&(p2bodydist y = [-70,5])&&P2statetype != A&&P2statetype != L&& random < (250 * (AIlevel ** 2 / 64.0))
trigger1 = ctrl
trigger2 = stateno = 100
;---------------------------------------------------------------------------
;Crouching Medium Punch
[State -1, Crouching Medium Punch]
type = ChangeState
value = 410
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != L
trigger1 = (stateno = [200,209])|| (stateno = [230,239])||(stateno = [400,409])||(stateno = [430,439])&& movecontact
trigger1 = random < 500
trigger1 = p2bodydist x <= 40
;---------------------------------------------------------------------------
;Crouching High Punch
[State -1, Crouching High Punch]
type = ChangeState
value = 420
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != L && random < (450 * (AIlevel ** 2 / 64.0))
trigger1 = (stateno = [210,219])|| (stateno = [240,249])||(stateno = [410,419])||(stateno = [440,449])&& movehit
trigger1 = random < 600
trigger2 = p2bodydist x <= 40
trigger2 = STATENO=100
trigger3 = RANDOM<50
trigger3 = p2bodydist x <= 60
trigger3 = ctrl
;---------------------------------------------------------------------------
;Crouching Low Kick
[State -1, Crouching Low Kick]
type = ChangeState
value = 430
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != L && random < (200 * (AIlevel ** 2 / 64.0))&&p2bodydist x <=40 && p2statetype != L
trigger1 = (stateno = [200,209])|| (stateno = [400,409])&& movecontact
;---------------------------------------------------------------------------
; Crouching Medium Kick
[State -1, Crouching Medium Kick]
type = ChangeState
value = 440
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != L
trigger1 = (stateno = [210,219])|| (stateno = [230,239])||(stateno = [410,419])||(stateno = [430,439])&& movecontact
trigger1 = random < 250
;---------------------------------------------------------------------------
;Crouching High Kick
[State -1, Crouching High Kick]
type = ChangeState
value = 450
triggerall = AILevel && numenemy&&roundstate=2&&StateType != A&&P2statetype != A&&P2statetype != L
trigger1 = (stateno = [240,249])|| (stateno = [440,449])&& movehit && stateno != 225
trigger1 = random < 50
trigger1 = p2bodydist x <=60
;---------------------------------------------------------------------------
;Jumping Low Punch
[State -1, Jumping Low Punch]
type = ChangeState
value = 600
triggerall= AILevel && numenemy&&Roundstate=2
triggerall= StateType = A && P2statetype != L &&(P2BodyDist Y = [-70, 30])
trigger1 = ctrl
trigger3 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping Medium Punch
[State -1, Jumping Medium Punch]
type = ChangeState
value = 610
triggerall =AILevel && numenemy&&roundstate=2
trigger1 = (stateno = [600,609])&& movecontact
trigger1 = random < 200
trigger2 = (stateno = [630,639])&& movecontact
trigger2 = random < 800
trigger3 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping High Punch
[State -1, Jumping High Punch]
type = ChangeState
value = 620
triggerall = AILevel && numenemy&&roundstate=2
trigger1 = (stateno = [610,619])&& movehit
trigger1 = random < 150
trigger2 = (stateno = [630,639])&& movehit
trigger2 = random < 800
trigger3 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping Low Kick
[State -1, Jumping Low Kick]
type = ChangeState
value = 630
triggerall = AILevel && numenemy&&roundstate=2
trigger1 = (stateno = [600,609])&& movecontact
;---------------------------------------------------------------------------
;Jumping Medium Kick
[State -1, Jumping Medium Kick]
type = ChangeState
value = 640
triggerall = AILevel && numenemy&&roundstate=2
trigger1 = (stateno = [610,619])&& movecontact
trigger1 = random < 850
trigger2 = (stateno = [630,639])&& movecontact
trigger2 = random < 150
trigger3 = stateno = [110, 115]
;---------------------------------------------------------------------------
;Jumping High Kick
[State -1, Jumping High Kick]
type = ChangeState
value = 650
triggerall = AILevel && numenemy&&roundstate=2
trigger1 = (stateno = [620,629])&& movehit
trigger1 = random < 800
trigger2 = (stateno = [640,649])&& movehit
trigger2 = random < 150
trigger3 = stateno = [110, 115]
;---------------------------------------------------------------------------

;[State -1, throw]
;type = changestate
;value = 800
;triggerall = AIlevel && numenemy
;triggerall = roundstate = 2 && statetype = S && stateno != 100 && ctrl
;triggerall = p2statetype != A && p2statetype != L && p2movetype != H
;trigger1 = (p2bodydist x = [0, 20]) && (p2bodydist y = [ -25, 25]) && random < (250 * (AIlevel ** 2 / 64.0))
;trigger2 = (p2stateno != [120, 155]) && (p2bodydist x = [0, 26]) && (p2bodydist y = [ -25, 25]) && random < (500 * (AIlevel ** 2 / 64.0))
;---------------------------------------------------------------------------
[State -1, ki push]
type = changestate
value =  1010
triggerall=AIlevel&&roundstate = 2 && statetype != A
triggerall=(enemynear,Movetype!=A)&&(enemynear,stateno!=[120,155])&&(enemynear,statetype!=A)&&(enemynear,statetype!=C)&&(enemynear,statetype!=L)
triggerall=(p2dist x=[10,80])&&(p2dist y=[-80,5])&&(random<250)*(AIlevel ** 2 / 64.0)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;------------------------------------------------------------------------------
[State -1, ]
type = ChangeState
value = 1100
triggerall=AILevel&&Roundstate=2&&statetype != A&& random < (250 * (AIlevel ** 2 / 64.0))
triggerall=(enemynear,Movetype!=A)&&(enemynear,Statetype!=L)&&(enemynear,Stateno!=[120,155])&&(enemynear,Stateno!=[5100,5250])&&(p2dist x=[-40,50])&&(p2dist y=[-110,5])
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;---------------------------------------------------------------------------
[State -1, ]
type = changestate
value = 1200; ifelse(random < 500, 1050, 1000);1000
triggerall=AIlevel&&roundstate = 2 && statetype != A
triggerall=(enemynear,Movetype!=A)&&(enemynear,stateno!=[120,155])&&(enemynear,statetype!=A)&&(enemynear,statetype!=C)&&(enemynear,statetype!=L)
triggerall=(p2dist x>=100)&&(p2dist y=[-80,5])&&(random<40*(AIlevel ** 2 / 64.0))
triggerall =!numhelper(1005)&&!numhelper(1025)&&!numhelper(1015) && !numhelper(3005) && !numhelper(3025) && !numhelper(3045) && !numhelper(3055)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;--------------------------------------------------------------------------------------------
[State -1, Chariot Tackle]
type = ChangeState
value = ifElse(Random < 100, 1302, 1300)
triggerall=AILevel&&Roundstate=2&&statetype != A&& random < (200 * (AIlevel ** 2 / 64.0))
triggerall=(enemynear,Movetype!=A)&&(enemynear,Statetype!=A)&&(enemynear,Statetype!=L)
triggerall=(enemynear,Stateno!=[120,155])&&(enemynear,Stateno!=[5100,5250])&&(p2dist x=[50,220])&&(p2dist y=[-80,5])
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact

;--------------------------------------------------------------------------
[State -1, kamehameha]
type = changestate
value = 3000
triggerall=AIlevel&&roundstate = 2 && statetype != A &&power >= 1000
triggerall=(enemynear,Movetype!=A)&&(enemynear,stateno!=[120,155])&&(enemynear,statetype!=L)
triggerall=(p2dist x>=80)&&(p2dist y=[-80,5])&&(random<150)*(AIlevel ** 2 / 64.0)
triggerall = !numhelper(3005) 
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact
;----------------------------------------------------------------------------------
[State -1, BIG BANG ATTACK]
type = changestate
value = 3001
triggerall=AIlevel&&roundstate = 2 && statetype != A &&power >= 1000
triggerall=(enemynear,Movetype!=A)&&(enemynear,stateno!=[120,155])&&(enemynear,statetype!=L)
triggerall = !numhelper(3015)
triggerall=(p2dist x>=60)&&(p2dist y=[-60,5])&&random<200*(AIlevel ** 2 / 64.0)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact
;-------------------------------------------------------------------------
[State -1,]
type = changestate
value = 3100
triggerall=AIlevel&&roundstate = 2 && statetype != A &&power >= 2000
triggerall=(enemynear,Movetype!=A)&&(enemynear,stateno!=[120,155])&(enemynear,statetype!=C)&&(enemynear,statetype!=L)
triggerall=(p2dist x=[10,120])&&(p2dist y=[-110,5])&&random<300*(AIlevel ** 2 / 64.0)
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&stateno!=420&&movecontact
;------------------------------------------------------------------------
[State -1, Final Kamehameha]
type = changestate
value = 3200
triggerall=AIlevel&&roundstate = 2 && statetype != A &&power >= 3000
triggerall=(enemynear,Movetype!=A)&&(enemynear,statetype!=A)&&(enemynear,statetype!=L)
triggerall=(p2dist x=[50,180])&&(p2dist y=[-80,5])&&(random<600*(AIlevel ** 2 / 64.0))
trigger1 = ctrl
trigger2 = (stateno = [200,450])&&anim!=221&&stateno!=420&&movecontact