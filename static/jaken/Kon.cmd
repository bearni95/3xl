; Attack Priority Order:
;
; QCF x 2
; QCB HCF
; F HCF
;
; DP
; HCF
; DU
; QCF
; DD

;-| Button Remapping |-----------------------------------------------------
[Remap]
x = x
y = y
z = c
a = a
b = b
c = z
s = s

;-| Default Values |-------------------------------------------------------
[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.
command.time = 15

; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.
command.buffer.time = 1

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

;--- None of your own command definitions should be above this line. ---

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
command = x+y+a+b+z+c
time = 1


;-| Super Motions |--------------------------------------------------------
[Command]
name = "D,HCF_y"
command = D, B, D, F, x
time = 20

[Command]
name = "D,HCF_x"
command = D, B, D, F, y
time = 20

[Command]
name = "D,HCF_a"
command = D, B, D, F, b
time = 20

[Command]
name = "D,HCB_y"
command = D, F, D, B, x
time = 20

[Command]
name = "D,HCB_x"
command = D, F, D, B, y
time = 20

[Command]
name = "D,HCB_a"
command = D, F, D, B, b
time = 20

[Command]
name = "F,HCF_y"
command = F, B, D, F, x
time = 20

[Command]
name = "F,HCF_x"
command = F, B, D, F, y
time = 20

[Command]
name = "F,HCF_a"
command = F, B, D, F, b
time = 20

[Command]
name = "B,HCB_y"
command = B, F, D, B, x
time = 20

[Command]
name = "B,HCB_x"
command = B, F, D, B, y
time = 20

[Command]
name = "B,HCB_a"
command = B, F, D, B, b
time = 20

[Command]
name = "QCFx2_y"
command = D, F, D, F, x
time = 20

[Command]
name = "QCFx2_x"
command = D, F, D, F, y
time = 20

[Command]
name = "QCFx2_a"
command = D, F, D, F, b
time = 20

[Command]
name = "QCBx2_y"
command = D, B, D, B, x
time = 20

[Command]
name = "QCBx2_x"
command = D, B, D, B, y
time = 20

[Command]
name = "QCBx2_a"
command = D, B, D, B, b
time = 20

;-| Special Motions |------------------------------------------------------

[Command]
name = "DP_y"
command = ~F, D, $F, x
buffer.time = 8

[Command]
name = "DP_x"
command = ~F, D, $F, y
buffer.time = 8

[Command]
name = "DP_a"
command = ~F, D, $F, b
buffer.time = 8

[Command]
name = "RDP_y"
command = ~B, D, $B, x
buffer.time = 8

[Command]
name = "RDP_x"
command = ~B, D, $B, y
buffer.time = 8

[Command]
name = "RDP_a"
command = ~B, D, $B, b
buffer.time = 8

[Command]
name = "HCF_y"
command = ~B, $D, F, x
buffer.time = 8

[Command]
name = "HCF_x"
command = ~B, $D, F, y
buffer.time = 8

[Command]
name = "HCF_a"
command = ~B, $D, F, b
buffer.time = 8

[Command]
name = "HCB_y"
command = ~F, $D, B, x
buffer.time = 8

[Command]
name = "HCB_x"
command = ~F, $D, B, y
buffer.time = 8

[Command]
name = "HCB_a"
command = ~F, $D, B, b
buffer.time = 8

[Command]
name = "DU_y"
command = ~$D, >$U, x
buffer.time = 8

[Command]
name = "DU_x"
command = ~$D, >$U, y
buffer.time = 8

[Command]
name = "DU_a"
command = ~$D, >$U, b
buffer.time = 8

[Command]
name = "RDU_y"
command = ~$D, >UB, x
buffer.time = 8

[Command]
name = "RDU_x"
command = ~$D, >UB, y
buffer.time = 8

[Command]
name = "RDU_a"
command = ~$D, >UB, b
buffer.time = 8

[Command]
name = "QCF_y"
command = ~$D, F, x
buffer.time = 8

[Command]
name = "QCF_x"
command = ~$D, F, y
buffer.time = 8

[Command]
name = "QCF_a"
command = ~$D, F, b
buffer.time = 8

[Command]
name = "QCB_y"
command = ~$D, B, x
buffer.time = 8

[Command]
name = "QCB_x"
command = ~$D, B, y
buffer.time = 8

[Command]
name = "QCB_a"
command = ~$D, B, b
buffer.time = 8

[Command]
name = "DD_y"
command = D, >~D, D, x
buffer.time = 8

[Command]
name = "DD_x"
command = D, >~D, D, y
buffer.time = 8

[Command]
name = "DD_a"
command = D, >~D, D, b
buffer.time = 8

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, >~F, /F
time = 12
buffer.time = 2

[Command]
name = "BB"     ;Required (do not remove)
command = B, >~B, /B
time = 12
buffer.time = 2

[Command]
name = "AFF"
command = F, >~F, /F
time = 12
buffer.time = 4

[Command]
name = "AFF"
command = UF, >~UF, /F
time = 12
buffer.time = 4

[Command]
name = "ABB"
command = B, >~B, /B
time = 12
buffer.time = 4

[Command]
name = "ABB"
command = UB, >~UB, /B
time = 12
buffer.time = 4

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y+a+b+z+c ; You shouldn't be able to recover, but it might get mad if I remove...?
time = 1

[Command]
name = "Throw"
command = x+y
time = 1
buffer.time = 8

[Command]
name = "Throw"
command = x+b
time = 1
buffer.time = 8

[Command]
name = "Throw"
command = y+b
time = 1
buffer.time = 8

[Command]
name = "DC"
command = x+a
time = 1
buffer.time = 2

[Command]
name = "DC"
command = y+a
time = 1
buffer.time = 2

[Command]
name = "DC"
command = b+a
time = 1
buffer.time = 2

[Command]
name = "LY"
command = /c, x
time = 1
buffer.time = 8

[Command]
name = "LX"
command = /c, y
time = 1
buffer.time = 8

[Command]
name = "LA"
command = /c, b
time = 1
buffer.time = 8

;-| Dir + Button |-------------------------------------------
;[Command]
;name = "down_l"
;command = /$D,c
;time = 1

;[Command]
;name = "up_l"
;command = /$U,c
;time = 1

;-| More Hold Dir |--------------------------------------------------------------

[Command]
name = "fakedup"
command = $U
time = 1

;-| Press Dir |-------------------------------------------------------------
[Command]
name = "back"
command = ~$B
time = 1

[Command]
name = "forcheck" ; Checks if you pressed back to prevent incorrect fdf's
command = ~$F
time = 1
buffer.time = 12

[Command]
name = "backcheck" ; Checks if you pressed back to prevent incorrect fdf's
command = ~$B
time = 1
buffer.time = 12

;---------------------------------------------------------------------------
; State entry
[Statedef -1]

[State -1, AI Helper Check]
type = ChangeState
trigger1 = IsHelper(9741)
value = 9741

[State -1, AI Helper Check 2]
type = ChangeState
trigger1 = IsHelper(9742)
value = 9742

[State -1, Tick Fix]
type = CtrlSet
trigger1 = !ctrl
trigger1 = (stateno=[200,799]) && !animtime
value = 1

;------------------------------------------------------------------------------
; Custom Commands
;------------------------------------------------------------------------------

[State -1, Down Down Reset]
type = varset
trigger1 = !command = "holddown"
trigger1 = fvar(8) = -1
fvar(8) = 0
ignorehitpause = 1

[State -1, Down Down Increment]
type = varset
;triggerall = ifelse(fvar(8) >= 61, (stateno != [1000,2999]) || (stateno = [1100,1125]), 1)
;trigger1 = movecontact != 1
trigger1 = fvar(8) > 0
fvar(8) = fvar(8) + 1
ignorehitpause = 1

[State -1, Down Down Lock]
type = varset
trigger1 = command = "holddown"
trigger1 = fvar(8) = 20
fvar(8) = -1
ignorehitpause = 1

[State -1, Down Down Reset]
type = varset
;triggerall = movecontact != 1
trigger1 = fvar(8) < 61
trigger1 = Floor(fvar(8)) % 20 = 0
trigger2 = fvar(8) >= 61
trigger2 = Floor((fvar(8) - 10)) % 15 = 0
fvar(8) = 0
ignorehitpause = 1

[State -1, Down Down 1st Down]
type = varset
trigger1 = command = "holddown"
trigger1 = fvar(8) = 0
fvar(8) = 1
ignorehitpause = 1

[State -1, Down Down Release Down/2nd Down]
type = varset
trigger1 = fvar(8) > 0
trigger1 = fvar(8) < 20
trigger1 = command != "holddown"
fvar(8) = fvar(8) + 20
ignorehitpause = 1

[State -1, Down Down Release Down/2nd Down]
type = varset
trigger1 = fvar(8) > 20
trigger1 = fvar(8) < 40
trigger1 = command = "holddown"
fvar(8) = fvar(8) + 20
ignorehitpause = 1

[State -1, Down Down Attack Button]
type = varset
trigger1 = fvar(8) > 40
trigger1 = fvar(8) < 60
trigger1 = command = "x" || command = "y" || command = "b"
fvar(8) = ifelse(command = "b", 91, ifelse(command = "y", 76, 61))
ignorehitpause = 1

[State -1, Right Right Increment]
type = varset
trigger1 = fvar(9) > 0
fvar(9) = fvar(9) + 1
ignorehitpause = 1

[State -1, Right Right Lock]
type = varset
triggerall = (facing = 1 && command = "holdfwd") || (facing = -1 && command = "holdback")
triggerall = command != "holddown"
triggerall = command != "holdup"
trigger1 = fvar(9) < 61
trigger1 = fvar(9) > 0
trigger1 = Floor(fvar(9)) % 15 = 0
fvar(9) = -1
ignorehitpause = 1

[State -1, Right Right Reset]
type = varset
trigger1 = fvar(9) < 61
trigger1 = Floor(fvar(9)) % 15 = 0
trigger2 = fvar(9) > 61
trigger2 = Floor((fvar(9) - 10)) % 15 = 0
trigger3 = fvar(9) = -1
trigger3 = !((facing = 1 && command = "holdfwd") || (facing = -1 && command = "holdback"))
fvar(9) = 0
ignorehitpause = 1

[State -1, Right Right 1st Right]
type = varset
trigger1 = (facing = 1 && command = "holdfwd") || (facing = -1 && command = "holdback")
trigger1 = command != "holddown"
trigger1 = command != "holdup"
trigger1 = fvar(9) = 0
fvar(9) = 1
ignorehitpause = 1

[State -1, Right Right Release Right]
type = varset
trigger1 = fvar(9) > 0
trigger1 = fvar(9) < 15
trigger1 = !((facing = 1 && command = "holdfwd") || (facing = -1 && command = "holdback"))
fvar(9) = fvar(9) + 15
ignorehitpause = 1

[State -1, Right Right 2nd Right]
type = varset
trigger1 = fvar(9) > 15
trigger1 = fvar(9) < 30
trigger1 = (facing = 1 && command = "holdfwd") || (facing = -1 && command = "holdback")
trigger1 = command != "holddown"
trigger1 = command != "holdup"
fvar(9) = 61
ignorehitpause = 1

[State -1, Left Left Increment]
type = varset
trigger1 = fvar(10) > 0
fvar(10) = fvar(10) + 1
ignorehitpause = 1

[State -1, Left Left Lock]
type = varset
triggerall = (facing = -1 && command = "holdfwd") || (facing = 1 && command = "holdback")
triggerall = command != "holddown"
triggerall = command != "holdup"
trigger1 = fvar(10) < 61
trigger1 = fvar(10) > 0
trigger1 = Floor(fvar(10)) % 15 = 0
fvar(10) = -1
ignorehitpause = 1

[State -1, Left Left Reset]
type = varset
trigger1 = fvar(10) < 61
trigger1 = Floor(fvar(10)) % 15 = 0
trigger2 = fvar(10) > 61
trigger2 = Floor((fvar(10) - 10)) % 15 = 0
trigger3 = fvar(10) = -1
trigger3 = !((facing = -1 && command = "holdfwd") || (facing = 1 && command = "holdback"))
fvar(10) = 0
ignorehitpause = 1

[State -1, Left Left 1st Left]
type = varset
trigger1 = (facing = -1 && command = "holdfwd") || (facing = 1 && command = "holdback")
trigger1 = command != "holddown"
trigger1 = command != "holdup"
trigger1 = fvar(10) = 0
fvar(10) = 1
ignorehitpause = 1

[State -1, Left Left Release Left]
type = varset
trigger1 = fvar(10) > 0
trigger1 = fvar(10) < 15
trigger1 = !((facing = -1 && command = "holdfwd") || (facing = 1 && command = "holdback"))
fvar(10) = fvar(10) + 15
ignorehitpause = 1

[State -1, Left Left 2nd Left]
type = varset
trigger1 = fvar(10) > 15
trigger1 = fvar(10) < 30
trigger1 = (facing = -1 && command = "holdfwd") || (facing = 1 && command = "holdback")
trigger1 = command != "holddown"
trigger1 = command != "holdup"
fvar(10) = 61
ignorehitpause = 1

;------------------------------------------------------------------------------
; COMBO VARIABLE SETTINGS
; -----------------------
; When an attack connects with the opponent and a second command is input
; during the first hit, this variable is set to a specific value depending on
; the command for the second attack. If the second command can be chained from
; the first command, as specified in the first command's state definition (CNS
; file), then the second command will activate when a certain amount of time
; has elapsed during the first command (also in CNS file). This allows for
; buffering of combo inputs.
;
; I'm also using this to cancel running to other states so ctrl for running
;  canbe set to 0 (and thus no cancelling it to itself/crouching)
;
; Thank you to 645 for this. :D
;------------------------------------------------------------------------------

[State -1, Clear Combo Condition]
type = VarSet
trigger1 = !movecontact
trigger1 = ifelse((stateno = [600,799]) || ((stateno = 52) && time = 0), (var(1) != [100,105]), 1)
var(1) = 0
ignorehitpause = 1

[State -1, Land to Run Forward]
type = varset
triggerall = fvar(9) >= 61 || fvar(10) >= 61
trigger1 = StateNo = [600,799]
var(1) = 100
ignorehitpause = 1

[State -1, Running to Jump]
type = varset
triggerall = Command = "holdup"
trigger1 = StateNo = [100,105]
var(1) = 40
ignorehitpause = 1

[State -1, Running to Guard]
type = varset
triggerall = Command = "holdz"
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 120
ignorehitpause = 1

[State -1, Running to Taunt]
type = varset
triggerall = Command = "start"
trigger1 = StateNo = [100,105]
var(1) = 195
ignorehitpause = 1

[State -1, Combo Into sL]
type = varset
triggerall = Command = "x"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 200
ignorehitpause = 1

[State -1, Combo Into sM]
type = varset
triggerall = Command = "y"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 210
ignorehitpause = 1

[State -1, Combo Into sH]
type = varset
triggerall = Command = "b"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 220
ignorehitpause = 1

[State -1, Combo Into cL]
type = varset
triggerall = Command = "x"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 400
ignorehitpause = 1

[State -1, Combo Into cM]
type = varset
triggerall = Command = "y"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 410
ignorehitpause = 1

[State -1, Combo Into cH]
type = varset
triggerall = Command = "b"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 420
ignorehitpause = 1

[State -1, Combo Into aL]
type = varset
triggerall = Command = "x"
trigger1 = statetype = A
trigger1 = MoveContact
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 600
ignorehitpause = 1

[State -1, Combo Into aM]
type = varset
triggerall = Command = "y"
trigger1 = statetype = A
trigger1 = MoveContact
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 610
ignorehitpause = 1

[State -1, Combo Into aH]
type = varset
triggerall = Command = "b"
trigger1 = statetype = A
trigger1 = MoveContact
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 620
ignorehitpause = 1

[State -1, Combo Into sSlide]
type = varset
triggerall = Command = "a"
triggerall = Command != "holdback"
triggerall = var(13) >= 1
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 800
ignorehitpause = 1

[State -1, Combo Into sSlide back]
type = varset
triggerall = Command = "a"
triggerall = Command = "holdback"
triggerall = var(13) >= 1
trigger1 = statetype != A
trigger1 = MoveContact
trigger2 = StateNo = [100,105]
var(1) = 801

[State -1, Combo Into aSlide]
type = varset
triggerall = Command = "a"
triggerall = Command != "holdback"
triggerall = var(13) >= 1
trigger1 = statetype = A
trigger1 = MoveContact
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 800

[State -1, Combo Into aSlide back]
type = varset
triggerall = Command = "a"
triggerall = Command = "holdback"
triggerall = var(13) >= 1
trigger1 = statetype = A
trigger1 = MoveContact
trigger2 = (StateNo = 856) || (StateNo = 858)
var(1) = 801

[State -1, Air Dash to Air Dash Fwd]
type = varset
triggerall = command = "AFF"
triggerall = var(49) > 0
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = time >= 8
value = 855
ignorehitpause = 1

[State -1, Air Dash to Air Dash Back]
type = varset
triggerall = command = "ABB"
triggerall = var(49) > 0
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = time >= 8
value = 857
ignorehitpause = 1

[State -1, Running to L backward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 61
triggerall = command = "holdback"
trigger1 = StateNo = [100,105]
var(1) = 1205

[State -1, Running to L forward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 61
triggerall = command != "holdback"
trigger1 = StateNo = [100,105]
var(1) = 1200

[State -1, Running to M backward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 76
triggerall = command = "holdback"
trigger1 = StateNo = [100,105]
var(1) = 1215

[State -1, Running to M forward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 76
triggerall = command != "holdback"
trigger1 = StateNo = [100,105]
var(1) = 1210

[State -1, Running to RF backward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 91
triggerall = command = "holdback"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
var(1) = 1225

[State -1, Running to RF forward Tatsumaki Senpuu Kyaku]
type = varset
triggerall = fvar(8) >= 91
triggerall = command != "holdback"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
var(1) = 1220

[State -1, Running to L backward Hadouken]
type = varset
triggerall = Command = "QCB_y"
trigger1 = StateNo = [100,105]
var(1) = 1105

[State -1, Running to L forward Hadouken]
type = varset
triggerall = Command = "QCF_y"
trigger1 = StateNo = [100,105]
var(1) = 1100

[State -1, Running to M backward Hadouken]
type = varset
trigger1 = Command = "QCB_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "QCB_a"
trigger2 = StateNo = [100,105]
trigger2 = var(11) < 1
var(1) = 1115

[State -1, Running to M forward Hadouken]
type = varset
trigger1 = Command = "QCF_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "QCF_a"
trigger2 = StateNo = [100,105]
trigger2 = var(11) < 1
var(1) = 1110

[State -1, Running to RF backward Hadouken]
type = varset
triggerall = Command = "QCB_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
var(1) = 1125

[State -1, Running to RF forward Hadouken]
type = varset
triggerall = Command = "QCF_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
var(1) = 1120

[State -1, Air Dash to L backward Hadouken]
type = varset
triggerall = Command = "QCB_y"
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
var(1) = 1105

[State -1, Air Dash to L forward Hadouken]
type = varset
triggerall = Command = "QCF_y"
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
var(1) = 1100

[State -1, Air Dash to M backward Hadouken]
type = varset
trigger1 = Command = "QCB_x"
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
trigger2 = Command = "QCB_a"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(51) = 1
trigger2 = var(11) < 1
var(1) = 1115

[State -1, Air Dash to M forward Hadouken]
type = varset
trigger1 = Command = "QCF_x"
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
trigger2 = Command = "QCF_a"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(51) = 1
trigger2 = var(11) < 1
var(1) = 1110

[State -1, Air Dash to RF backward Hadouken]
type = varset
triggerall = Command = "QCB_a"
triggerall = var(11) >= 1
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
var(1) = 1125

[State -1, Air Dash to RF forward Hadouken]
type = varset
triggerall = Command = "QCF_a"
triggerall = var(11) >= 1
trigger1 = (StateNo = 856) || (StateNo = 858)
trigger1 = var(51) = 1
var(1) = 1120

[State -1, Running to L backward SPLASH]
type = varset
triggerall = Command = "HCB_y"
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1005

[State -1, Running to L forward SPLASH]
type = varset
triggerall = Command = "HCF_y"
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1000

[State -1, Running to M backward SPLASH]
type = varset
trigger1 = Command = "HCB_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "HCB_x"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
trigger3 = var(11) < 1
trigger3 = Command = "HCB_a"
trigger3 = StateNo = [100,105]
trigger4 = var(11) < 1
trigger4 = Command = "HCB_a"
trigger4 = StateNo = [855,858]
trigger4 = var(53) = 1
var(1) = 1015

[State -1, Running to M forward SPLASH]
type = varset
trigger1 = Command = "HCF_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "HCF_x"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
trigger3 = var(11) < 1
trigger3 = Command = "HCF_a"
trigger3 = StateNo = [100,105]
trigger4 = var(11) < 1
trigger4 = Command = "HCF_a"
trigger4 = StateNo = [855,858]
trigger4 = var(53) = 1
var(1) = 1010

[State -1, Running to RF backward SPLASH]
type = varset
triggerall = Command = "HCB_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1025

[State -1, Running to RF forward SPLASH]
type = varset
triggerall = Command = "HCF_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1020

[State -1, Running to L backward Shoryuuken]
type = varset
triggerall = Command = "RDP_y"
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1305

[State -1, Running to L forward Shoryuuken]
type = varset
triggerall = Command = "DP_y"
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1300

[State -1, Running to M backward Shoryuuken]
type = varset
trigger1 = Command = "RDP_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "RDP_x"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
trigger3 = var(11) < 1
trigger3 = Command = "RDP_a"
trigger3 = StateNo = [100,105]
trigger4 = var(11) < 1
trigger4 = Command = "RDP_a"
trigger4 = StateNo = [855,858]
trigger4 = var(53) = 1
var(1) = 1315

[State -1, Running to M forward Shoryuuken]
type = varset
trigger1 = Command = "DP_x"
trigger1 = StateNo = [100,105]
trigger2 = Command = "DP_x"
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
trigger3 = var(11) < 1
trigger3 = Command = "DP_a"
trigger3 = StateNo = [100,105]
trigger4 = var(11) < 1
trigger4 = Command = "DP_a"
trigger4 = StateNo = [855,858]
trigger4 = var(53) = 1
var(1) = 1310

[State -1, Running to RF backward Shoryuuken]
type = varset
triggerall = Command = "RDP_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1325

[State -1, Running to RF forward Shoryuuken]
type = varset
triggerall = Command = "DP_a"
triggerall = var(11) >= 1
trigger1 = StateNo = [100,105]
trigger2 = (StateNo = 856) || (StateNo = 858)
trigger2 = var(53) = 1
var(1) = 1320

;------------------------------------------------------------------------------
; JUMP ATTACK BUFFER VARIABLE SETTINGS
; -----------------------
; Like the combo one but for jump cancels.
;------------------------------------------------------------------------------

[State -1, Clear Jump Cancel Condition]
type = VarSet
trigger1 = StateNo != [45,50]
var(2) = 0

[State -1, Jump Cancel Into aL]
type = varset
trigger1 = Command = "y"
trigger1 = StateNo = [45,50]
var(2) = 600

[State -1, Jump Cancel Into aM]
type = varset
trigger1 = Command = "x"
trigger1 = StateNo = [45,50]
var(2) = 610

[State -1, Jump Cancel Into aH]
type = varset
trigger1 = Command = "a"
trigger1 = StateNo = [45,50]
var(2) = 620

[State -1, Jump Cancel Into aSlide]
type = varset
trigger1 = Command = "b"
trigger1 = Command = "holdback"
trigger1 = StateNo = [45,50]
var(2) = 800

[State -1, Jump Cancel Into aSlide back]
type = varset
trigger1 = Command = "b"
trigger1 = Command = "holdback"
trigger1 = StateNo = [45,50]
var(2) = 801

;===========================================================================
[State -1, SPLASH Combo Condition Reset]
type = VarSet
trigger1 = 1
var(2) = 0

[State -1, Hadouken Combo Condition Reset]
type = VarSet
trigger1 = 1
var(3) = 0

[State -1, Tatsumaki Senpuu Kyaku Combo Condition Reset]
type = VarSet
trigger1 = 1
var(4) = 0

[State -1, Shoryuuken Combo Condition Reset]
type = VarSet
trigger1 = 1
var(5) = 0

[State -1, Shinkuu Hadouken Combo Condition Reset]
type = VarSet
trigger1 = 1
var(7) = 0

[State -1, Shinkuu Tatsumaki Combo Condition Reset]
type = VarSet
trigger1 = 1
var(8) = 0

[State -1, Shoryuu Reppa Combo Condition Reset]
type = VarSet
trigger1 = 1
var(9) = 0

[State -1, SPLASH Combo Condition Check]
type = VarSet
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
var(2) = 1

[State -1, Hadouken Combo Condition Check]
type = VarSet
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
var(3) = 1

[State -1, Tatsumaki Senpuu Kyaku Combo Condition Check]
type = VarSet
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
var(4) = 1

[State -1, Shoryuuken Combo Condition Check]
type = VarSet
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
var(5) = 1

[State -1, Shinkuu Hadouken Combo Condition Check]
type = VarSet
;triggerall = var(1) != [3000,3005]
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
trigger3 = (stateno = [1000,1055]) || (stateno = [1200,1255]) || (stateno = [1300,1355])
trigger3 = movecontact < 9
trigger3 = movecontact != 0
var(7) = 1

[State -1, Shinkuu Tatsukami Combo Condition Check]
type = VarSet
;triggerall = var(1) != [3000,3005]
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
trigger3 = (stateno = [1000,1055]) || (stateno = [1200,1255]) || (stateno = [1300,1355])
trigger3 = movecontact < 9
trigger3 = movecontact != 0
var(8) = 1

[State -1, Shoryuu Reppa Combo Condition Check]
type = VarSet
;triggerall = var(1) != [3200,3205]
trigger1 = ctrl || (StateNo = 40)
trigger2 = (stateno = [200,799])
trigger2 = movecontact
trigger3 = (stateno = [1000,1055]) || (stateno = [1200,1255]) || (stateno = [1300,1355])
trigger3 = movecontact < 9
trigger3 = movecontact != 0
var(9) = 1

[State -1, SPLASH Land Reset]
type = VarSet
trigger1 = 1
var(50) = 1 ; SPLASH

[State -1, Hadouken Land Reset]
type = VarSet
trigger1 = statetype != A
var(51) = 1

[State -1, Tatsumaki Senpuukyaku Land Reset]
type = VarSet
trigger1 = statetype != A
var(52) = 1

[State -1, Shoryuuken Land Reset]
type = VarSet
trigger1 = statetype != A
var(53) = 1

;===========================================================================
;---------------------------------------------------------------------------
; AI Controls
;---------------------------------------------------------------------------

;beep boop

;---------------------------------------------------------------------------
; Human Controls
;---------------------------------------------------------------------------

;---------------------------------------------------------------------------
;Throw
[State -1, Throw]
type = ChangeState
value = 900
triggerall = command = "Throw"
triggerall = (stateno != 100) && (stateno != 105) && (stateno != [855,858])
trigger1 = ctrl

;---------------------------------------------------------------------------
;Shinkuu Hadouken (Uses one super stock)
[State -1, Shinkuu Hadouken]
type = ChangeState
value = 3000
triggerall = roundstate != 3
triggerall = power >= 1000
;triggerall = statetype != A
triggerall = stateno != [100,105]
trigger1 = (command = "QCFx2_y")
trigger1 = var(7) = 1
trigger2 = (command = "QCFx2_x")
trigger2 = var(7) = 1
trigger3 = (command = "QCFx2_a")
trigger3 = var(7) = 1
trigger4 = (command = "LY")
trigger4 = (var(45) = 0)
trigger4 = command != "holdback"
trigger4 = var(7) = 1
trigger5 = (command = "QCFx2_y")
trigger5 = StateNo = [150,155]
trigger6 = (command = "QCFx2_x")
trigger6 = StateNo = [150,155]
trigger7 = (command = "QCFx2_a")
trigger7 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Shinkuu Hadouken while running (Uses one super stock)
[State -1, Shinkuu Hadouken Running]
type = ChangeState
value = 3000
triggerall = roundstate != 3
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "QCFx2_y"
trigger2 = command = "QCFx2_x"
trigger3 = command = "QCFx2_a"
trigger4 = (command = "LY")
trigger4 = (var(45) = 0)
trigger4 = command != "holdback"

;---------------------------------------------------------------------------
;Reverse Shinkuu Hadouken (Uses one super stock)
[State -1, Reverse Shinkuu Hadouken]
type = ChangeState
value = 3005
triggerall = roundstate != 3
triggerall = power >= 1000
;triggerall = statetype != A
triggerall = stateno != [100,105]
trigger1 = (command = "QCBx2_y")
trigger1 = var(7) = 1
trigger2 = (command = "QCBx2_x")
trigger2 = var(7) = 1
trigger3 = (command = "QCBx2_a")
trigger3 = var(7) = 1
trigger4 = (command = "LY")
trigger4 = (var(45) = 0)
trigger4 = command = "holdback"
trigger4 = var(7) = 1
trigger5 = (command = "QCBx2_y")
trigger5 = StateNo = [150,155]
trigger6 = (command = "QCBx2_x")
trigger6 = StateNo = [150,155]
trigger7 = (command = "QCBx2_a")
trigger7 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Reverse Shinkuu Hadouken while running (Uses one super stock)
[State -1, Reverse Shinkuu Hadouken Running]
type = ChangeState
value = 3005
triggerall = roundstate != 3
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "QCBx2_y"
trigger2 = command = "QCBx2_x"
trigger3 = command = "QCBx2_a"
trigger4 = (command = "LY")
trigger4 = (var(45) = 0)
trigger4 = command != "holdback"

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki (Uses one super stock)
[State -1, Shinkuu Tatsumaki]
type = ChangeState
value = 3100
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = stateno != [100,105]
triggerall = (StateNo != 856) && (StateNo != 858)
trigger1 = statetype = A
trigger1 = (command = "D,HCF_y") || (command = "D,HCF_x") || (command = "D,HCF_a") || ((command = "LX") && (var(46) = 0) && (command != "holdback"))
trigger1 = var(8) = 1
trigger2 = statetype = A
trigger2 = (command = "D,HCF_y") || (command = "D,HCF_x") || (command = "D,HCF_a")
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "D,HCF_y"
trigger3 = var(8) = 1
trigger4 = command = "D,HCF_x"
trigger4 = var(8) = 1
trigger5 = command = "D,HCF_a"
trigger5 = var(8) = 1
trigger6 = (command = "LX")
trigger6 = (var(46) = 0)
trigger6 = command != "holdback"
trigger6 = var(8) = 1
trigger7 = command = "D,HCF_y"
trigger7 = StateNo = [150,155]
trigger8 = command = "D,HCF_x"
trigger8 = StateNo = [150,155]
trigger9 = command = "D,HCF_a"
trigger9 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki while running (Uses one super stock)
[State -1, Shinkuu Tatsumaki Running]
type = ChangeState
value = 3100
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "D,HCF_y"
trigger2 = command = "D,HCF_x"
trigger3 = command = "D,HCF_a"
trigger4 = (command = "LX")
trigger4 = (var(46) = 0)
trigger4 = command != "holdback"

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki while air dashing (Uses one super stock)
[State -1, Shinkuu Tatsumaki Air Dash]
type = ChangeState
value = 3100
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = (StateNo = 856) || (StateNo = 858)
trigger1 = (command = "D,HCF_y") || (command = "D,HCF_x") || (command = "D,HCF_a") || ((command = "LX") && (var(46) = 0) && (command != "holdback"))
trigger1 = var(8) = 1

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki (Uses one super stock)
[State -1, Shinkuu Tatsumaki]
type = ChangeState
value = 3105
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = stateno != [100,105]
triggerall = (StateNo != 856) && (StateNo != 858)
trigger1 = statetype = A
trigger1 = (command = "D,HCB_y") || (command = "D,HCB_x") || (command = "D,HCB_a") || ((command = "LX") && (var(46) = 0) && (command = "holdback"))
trigger1 = var(8) = 1
trigger2 = statetype = A
trigger2 = (command = "D,HCB_y") || (command = "D,HCB_x") || (command = "D,HCB_a")
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "D,HCB_y"
trigger3 = var(8) = 1
trigger4 = command = "D,HCB_x"
trigger4 = var(8) = 1
trigger5 = command = "D,HCB_a"
trigger5 = var(8) = 1
trigger6 = (command = "LX")
trigger6 = (var(46) = 0)
trigger6 = command = "holdback"
trigger6 = var(8) = 1
trigger7 = command = "D,HCB_y"
trigger7 = StateNo = [150,155]
trigger8 = command = "D,HCB_x"
trigger8 = StateNo = [150,155]
trigger9 = command = "D,HCB_a"
trigger9 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki while running (Uses one super stock)
[State -1, Shinkuu Tatsumaki Running]
type = ChangeState
value = 3105
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "D,HCB_y"
trigger2 = command = "D,HCB_x"
trigger3 = command = "D,HCB_a"
trigger4 = (command = "LX")
trigger4 = (var(46) = 0)
trigger4 = command = "holdback"

;---------------------------------------------------------------------------
;Shinkuu Tatsumaki while air dashing (Uses one super stock)
[State -1, Shinkuu Tatsumaki Air Dash]
type = ChangeState
value = 3105
triggerall = roundstate != 3
triggerall = var(52) = 1
triggerall = power >= 1000
triggerall = (StateNo = 856) || (StateNo = 858)
trigger1 = (command = "D,HCB_y") || (command = "D,HCB_x") || (command = "D,HCB_a") || ((command = "LX") && (var(46) = 0) && (command = "holdback"))
trigger1 = var(8) = 1

;---------------------------------------------------------------------------
;Shoryuu Reppa (Uses one super stock)
[State -1, Shoryuu Reppa]
type = ChangeState
value = 3200
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = stateno != [100,105]
triggerall = (StateNo != 856) && (StateNo != 858)
trigger1 = statetype = A
trigger1 = (command = "F,HCF_y") || (command = "F,HCF_x") || (command = "F,HCF_a") || ((command = "LA") && (var(47) = 0) && (command != "holdback"))
trigger1 = var(9) = 1
trigger2 = statetype = A
trigger2 = (command = "F,HCF_y") || (command = "F,HCF_x") || (command = "F,HCF_a")
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = (command = "QCFx2_y")
trigger3 = var(9) = 1
trigger4 = (command = "QCFx2_x")
trigger4 = var(9) = 1
trigger5 = (command = "QCFx2_a")
trigger5 = var(9) = 1
trigger6 = (command = "LA")
trigger6 = (var(47) = 0)
trigger6 = command != "holdback"
trigger6 = var(9) = 1
trigger7 = (command = "QCFx2_y")
trigger7 = StateNo = [150,155]
trigger8 = (command = "QCFx2_x")
trigger8 = StateNo = [150,155]
trigger9 = (command = "QCFx2_a")
trigger9 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Shoryuu Reppa while running (Uses one super stock)
[State -1, Shoryuu Reppa Running]
type = ChangeState
value = 3200
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "F,HCF_y"
trigger2 = command = "F,HCF_x"
trigger3 = command = "F,HCF_a"
trigger4 = (command = "LA")
trigger4 = (var(47) = 0)
trigger4 = command != "holdback"

;---------------------------------------------------------------------------
;Shoryuu Reppa while air dashing (Uses one super stock)
[State -1, Shoryuu Reppa Air Dash]
type = ChangeState
value = 3200
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = (StateNo = 856) || (StateNo = 858)
trigger1 = (command = "F,HCF_y") || (command = "F,HCF_x") || (command = "F,HCF_a") || ((command = "LA") && (var(47) = 0) && (command != "holdback"))
trigger1 = var(9) = 1

;---------------------------------------------------------------------------
;Reverse Shoryuu Reppa (Uses one super stock)
[State -1, Reverse Shoryuu Reppa]
type = ChangeState
value = 3205
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = stateno != [100,105]
triggerall = (StateNo != 856) && (StateNo != 858)
trigger1 = statetype = A
trigger1 = (command = "B,HCB_y") || (command = "B,HCB_x") || (command = "B,HCB_a") || ((command = "LA") && (var(47) = 0) && (command = "holdback"))
trigger1 = var(9) = 1
trigger2 = statetype = A
trigger2 = (command = "B,HCB_y") || (command = "B,HCB_x") || (command = "B,HCB_a")
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = (command = "QCFx2_y")
trigger3 = var(9) = 1
trigger4 = (command = "QCFx2_x")
trigger4 = var(9) = 1
trigger5 = (command = "QCFx2_a")
trigger5 = var(9) = 1
trigger6 = (command = "LA")
trigger6 = (var(47) = 0)
trigger6 = command = "holdback"
trigger6 = var(9) = 1
trigger7 = (command = "QCFx2_y")
trigger7 = StateNo = [150,155]
trigger8 = (command = "QCFx2_x")
trigger8 = StateNo = [150,155]
trigger9 = (command = "QCFx2_a")
trigger9 = StateNo = [150,155]

;---------------------------------------------------------------------------
;Reverse Shoryuu Reppa while running (Uses one super stock)
[State -1, Reverse Shoryuu Reppa Running]
type = ChangeState
value = 3205
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = stateno = [100,105]
trigger1 = command = "B,HCB_y"
trigger2 = command = "B,HCB_x"
trigger3 = command = "B,HCB_a"
trigger4 = (command = "LA")
trigger4 = (var(47) = 0)
trigger4 = command = "holdback"

;---------------------------------------------------------------------------
;Reverse Shoryuu Reppa while air dashing (Uses one super stock)
[State -1, Reverse Shoryuu Reppa Air Dash]
type = ChangeState
value = 3205
triggerall = roundstate != 3
triggerall = var(53) = 1
triggerall = power >= 1000
triggerall = (StateNo = 856) || (StateNo = 858)
trigger1 = (command = "B,HCB_y") || (command = "B,HCB_x") || (command = "B,HCB_a") || ((command = "LA") && (var(47) = 0) && (command = "holdback"))
trigger1 = var(9) = 1

;---------------------------------------------------------------------------
;Reverse RF Shoryuuken
[State -1, Reverse RF Shoryuuken]
type = ChangeState
value = 1325
triggerall = var(53) = 1
triggerall = var(11) >= 1
triggerall = command = "RDP_a"
trigger1 = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = var(5) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = var(5) = 1
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;RF Shoryuuken
[State -1, RF Shoryuuken]
type = ChangeState
value = 1320
triggerall = var(53) = 1
triggerall = var(11) >= 1
trigger1 = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = command = "DP_a"
trigger1 = var(5) = 1
trigger2 = statetype = A
trigger2 = command = "DP_a"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "DP_a"
;triggerall = command = "DP_a"
trigger3 = var(5) = 1
trigger4 = command = "DP_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse Medium Shoryuuken
[State -1, Reverse Medium Shoryuuken]
type = ChangeState
value = 1315
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
triggerall = statetype != A ; was commented out for a reason?
trigger1 = command = "RDP_x"
trigger1 = var(5) = 1
trigger2 = command = "RDP_a"
trigger2 = var(5) = 1
trigger2 = var(11) < 1
trigger3 = command = "RDP_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "RDP_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Medium Shoryuuken
[State -1, Medium Shoryuuken]
type = ChangeState
value = 1310
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
triggerall = statetype != A ; was commented out for a reason?
trigger1 = command = "DP_x"
trigger1 = var(5) = 1
trigger2 = command = "DP_a"
trigger2 = var(5) = 1
trigger2 = var(11) < 1
trigger3 = command = "DP_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DP_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Air Medium Shoryuuken
[State -1, Reverse Air Medium Shoryuuken]
type = ChangeState
value = 1315
triggerall = statetype = A
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "RDP_x"
trigger1 = var(5) = 1
trigger2 = command = "RDP_a"
trigger2 = var(5) = 1
trigger2 = var(11) < 1
trigger3 = command = "RDP_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "RDP_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Air Medium Shoryuuken
[State -1, Air Medium Shoryuuken]
type = ChangeState
value = 1310
triggerall = statetype = A
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "DP_x"
trigger1 = var(5) = 1
trigger2 = command = "DP_a"
trigger2 = var(5) = 1
trigger2 = var(11) < 1
trigger3 = command = "DP_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DP_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Light Shoryuuken
[State -1, Reverse Light Shoryuuken]
type = ChangeState
value = 1305
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
triggerall = command = "RDP_y"
trigger1 = statetype = A
trigger1 = var(5) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = var(5) = 1
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Light Shoryuuken
[State -1, Light Shoryuuken]
type = ChangeState
value = 1300
triggerall = var(53) = 1
triggerall = StateNo != [100,105]
triggerall = command = "DP_y"
trigger1 = statetype = A
trigger1 = var(5) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = var(5) = 1
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse RF SPLASH!
[State -1, Reverse RF SPLASH!]
type = ChangeState
value = 1025
triggerall = var(50) = 1
triggerall = var(11) >= 1
trigger1 = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = command = "HCB_a"
trigger1 = var(2) = 1
trigger2 = statetype = A
trigger2 = command = "HCB_a"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "HCB_a"
trigger3 = var(2) = 1
trigger4 = command = "HCB_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;RF SPLASH!
[State -1, RF SPLASH!]
type = ChangeState
value = 1020
triggerall = var(50) = 1
triggerall = var(11) >= 1
triggerall = command = "HCF_a"
trigger1 = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = var(2) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = var(2) = 1
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse Medium SPLASH!
[State -1, Reverse Medium SPLASH!]
type = ChangeState
value = 1015
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
triggerall = statetype != A ; was commented out for a reason?
trigger1 = command = "HCB_x"
trigger1 = var(2) = 1
trigger2 = command = "HCB_a"
trigger2 = var(2) = 1
trigger2 = var(11) < 1
trigger3 = command = "HCB_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "HCB_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Medium SPLASH!
[State -1, Medium SPLASH!]
type = ChangeState
value = 1010
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
triggerall = statetype != A ; was commented out for a reason?
trigger1 =command = "HCF_x"
trigger1 = var(2) = 1
trigger2 = command = "HCF_a"
trigger2 = var(2) = 1
trigger2 = var(11) < 1
trigger3 = command = "HCF_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "HCF_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Air Medium SPLASH!
[State -1, Reverse Air Medium SPLASH!]
type = ChangeState
value = 1015
triggerall = statetype = A
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "HCB_x"
trigger1 = var(2) = 1
trigger2 = command = "HCB_a"
trigger2 = var(2) = 1
trigger2 = var(11) < 1
trigger3 = command = "HCB_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "HCB_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Air Medium SPLASH!
[State -1, Air Medium SPLASH!]
type = ChangeState
value = 1010
triggerall = statetype = A
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "HCF_x"
trigger1 = var(2) = 1
trigger2 = command = "HCF_a"
trigger2 = var(2) = 1
trigger2 = var(11) < 1
trigger3 = command = "HCF_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "HCF_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Light SPLASH!
[State -1, Reverse Light SPLASH!]
type = ChangeState
value = 1005
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = command = "HCB_y"
trigger1 = var(2) = 1
trigger2 = statetype = A
trigger2 = command = "HCB_y"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "HCB_y"
trigger3 = var(2) = 1
trigger4 = command = "HCB_y"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Light SPLASH!
[State -1, Light SPLASH!]
type = ChangeState
value = 1000
triggerall = var(50) = 1
triggerall = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = command = "HCF_y"
trigger1 = var(2) = 1
trigger2 = statetype = A
trigger2 = command = "HCF_y"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "HCF_y"
trigger3 = var(2) = 1
trigger4 = command = "HCF_y"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse RF Hadouken
[State -1, Reverse RF Hadouken]
type = ChangeState
value = 1125
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
triggerall = command = "QCB_a"
trigger1 = var(3) = 1
trigger1 = var(11) >= 1
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger2 = var(11) >= 1

;---------------------------------------------------------------------------
;RF Hadouken
[State -1, RF Hadouken]
type = ChangeState
value = 1120
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
triggerall = command = "QCF_a"
trigger1 = var(3) = 1
trigger1 = var(11) >= 1
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger2 = var(11) >= 1

;---------------------------------------------------------------------------
;Reverse Medium Hadouken
[State -1, Reverse Medium Hadouken]
type = ChangeState
value = 1115
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "QCB_x"
trigger1 = var(3) = 1
trigger2 = command = "QCB_a"
trigger2 = var(3) = 1
trigger2 = var(11) < 1
trigger3 = command = "QCB_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "QCB_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Medium Hadouken
[State -1, Medium Hadouken]
type = ChangeState
value = 1110
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
trigger1 = command = "QCF_x"
trigger1 = var(3) = 1
trigger2 = command = "QCF_a"
trigger2 = var(3) = 1
trigger2 = var(11) < 1
trigger3 = command = "QCF_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "QCF_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Light Hadouken
[State -1, Reverse Light Hadouken]
type = ChangeState
value = 1105
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
;triggerall = command = "QCB_y"
triggerall = command = "QCB_y"
trigger1 = var(3) = 1
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Light Hadouken
[State -1, Light Hadouken]
type = ChangeState
value = 1100
;triggerall = statetype != A
triggerall = var(51) = 1
triggerall = StateNo != [100,105]
;triggerall = command = "QCF_y"
triggerall = command = "QCF_y"
trigger1 = var(3) = 1
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse RF Tatsumaki Senpuu Kyaku
[State -1, Reverse RF Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1225
triggerall = var(52) = 1
triggerall = var(11) >= 1
triggerall = (fvar(8) >= 91)
triggerall = command = "holdback"
triggerall = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = var(4) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155]
trigger3 = var(4) = 1
trigger4 = StateNo = [150,155]

;---------------------------------------------------------------------------
;RF Tatsumaki Senpuu Kyaku
[State -1, RF Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1220
triggerall = var(52) = 1
triggerall = var(11) >= 1
triggerall = (fvar(8) >= 91)
triggerall = command != "holdback"
triggerall = StateNo != [100,105]
trigger1 = statetype = A
trigger1 = var(4) = 1
trigger2 = statetype = A
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = var(4) = 1
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Reverse Medium Tatsumaki Senpuu Kyaku
[State -1, Reverse Medium Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1215
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
;triggerall = statetype != A ; was commented out for a reason?
trigger1 = command = "DD_x"
trigger1 = command = "holdback"
trigger1 = var(4) = 1
trigger2 = command = "DD_a"
trigger2 = command = "holdback"
trigger2 = var(4) = 1
trigger2 = var(11) < 1
trigger3 = command = "DD_x"
trigger3 = command = "holdback"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DD_a"
trigger4 = command = "holdback"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Medium Tatsumaki Senpuu Kyaku
[State -1, Medium Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1210
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
;triggerall = statetype != A ; was commented out for a reason?
trigger1 = command = "DD_x"
trigger1 = command != "holdback"
trigger1 = var(4) = 1
trigger2 = command = "DD_a"
trigger2 = command != "holdback"
trigger2 = var(4) = 1
trigger2 = var(11) < 1
trigger3 = command = "DD_x"
trigger3 = command != "holdback"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DD_a"
trigger4 = command != "holdback"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Air Medium Tatsumaki Senpuu Kyaku
[State -1, Reverse Air Medium Tatsumaki Senpuu Kyaku]
type = null;ChangeState
value = 1215
triggerall = statetype = A
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
triggerall = command = "holdback"
trigger1 = command = "DD_x"
trigger1 = var(4) = 1
trigger2 = command = "DD_a"
trigger2 = var(4) = 1
trigger2 = var(11) < 1
trigger3 = command = "DD_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DD_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Air Medium Tatsumaki Senpuu Kyaku
[State -1, Air Medium Tatsumaki Senpuu Kyaku]
type = null;ChangeState
value = 1210
triggerall = statetype = A
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
triggerall = command != "holdback"
trigger1 = command = "DD_x"
trigger1 = var(4) = 1
trigger2 = command = "DD_a"
trigger2 = var(4) = 1
trigger2 = var(11) < 1
trigger3 = command = "DD_x"
trigger3 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = command = "DD_a"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger4 = var(11) < 1

;---------------------------------------------------------------------------
;Reverse Light Tatsumaki Senpuu Kyaku
[State -1, Reverse Light Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1205
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
triggerall = (fvar(8) >= 61)
trigger1 = statetype = A
trigger1 = command = "holdback"
trigger1 = var(4) = 1
trigger2 = statetype = A
trigger2 = command = "holdback"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command = "holdback"
;triggerall = command = "holdback"
trigger3 = var(4) = 1
trigger4 = command = "holdback"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Light Tatsumaki Senpuu Kyaku
[State -1, Light Tatsumaki Senpuu Kyaku]
type = ChangeState
value = 1200
triggerall = var(52) = 1
triggerall = StateNo != [100,105]
triggerall = (fvar(8) >= 61)
trigger1 = statetype = A
trigger1 = command != "holdback"
trigger1 = var(4) = 1
trigger2 = statetype = A
trigger2 = command = "holdback"
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)
trigger3 = command != "holdback"
;triggerall = command != "holdback"
trigger3 = var(4) = 1
trigger4 = command != "holdback"
trigger4 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;===========================================================================
;---------------------------------------------------------------------------
;Run Fwd
[State -1, Run Fwd]
type = ChangeState
value = 100
triggerall = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Run Back
[State -1, Run Back]
type = ChangeState
value = 105
triggerall = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl


;===========================================================================
;---------------------------------------------------------------------------
;Taunt
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Standing Heavy
[State -1, Standing Heavy]
type = ChangeState
value = 220
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Standing Medium
[State -1, Standing Medium]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Standing Light
[State -1, Standing Light]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Heavy
[State -1, Crouching Heavy]
type = ChangeState
value = 420
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Medium
[State -1, Crouching Medium]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Light
[State -1, Crouching Light]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jumping Heavy
[State -1, Jumping Heavy]
type = ChangeState
value = 620
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
trigger1 = vel X >= 0

;---------------------------------------------------------------------------
;Jumping Medium
[State -1, Jumping Medium]
type = ChangeState
value = 610
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
trigger1 = vel X >= 0

;---------------------------------------------------------------------------
;Jumping Light
[State -1, Jumping Light]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
trigger1 = vel X >= 0

;---------------------------------------------------------------------------
;Crouching
[State -1, Crouching]
type = ChangeState
value = 10
triggerall = statetype = S
triggerall = command = "holddown"
trigger1 = StateNo != [100,105]
trigger1 = ctrl

;---------------------------------------------------------------------------
;Guarding
[State -1, Guarding]
type = ChangeState
value = 120
triggerall = command = "holdz"
trigger1 = ctrl

;---------------------------------------------------------------------------
;Forward Face Slide
[State -1, Face Slide Fwd]
type = ChangeState
value = 800
triggerall = command = "a"
triggerall = command != "holdback"
;triggerall = statetype != A
triggerall = var(13) >= 1
trigger1 = ctrl
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Backward Face Slide
[State -1, Face Slide Back]
type = ChangeState
value = 801
triggerall = command = "a"
;triggerall = statetype != A
triggerall = var(13) >= 1
triggerall = command = "holdback"
trigger1 = ctrl
trigger2 = StateNo = [150,155] ;(Stateno = 151) || (Stateno = 153) || (Stateno = 155)

;---------------------------------------------------------------------------
;Air Dash
[State -1, Air Dash Fwd]
type = ChangeState
value = 855
triggerall = !var(0)
triggerall = ifelse(facing = 1, fvar(9) >= 61, fvar(10) >= 61 ) ;command = "AFF"
triggerall = statetype = A
triggerall = var(49) > 0
triggerall = ifelse((prevstateno = [40,45]), (time >= 6), 1)
trigger1 = ctrl

;---------------------------------------------------------------------------
;Air Dash Back
[State -1, Air Dash Back]
type = ChangeState
value = 857
triggerall = !var(0)
triggerall = ifelse(facing = 1, fvar(10) >= 61, fvar(9) >= 61 ) ;command = "ABB"
triggerall = statetype = A
triggerall = var(49) > 0
triggerall = ifelse((prevstateno = [40,45]), (time >= 6), 1)
trigger1 = ctrl

;---------------------------------------------------------------------------
;Damage Cancel
[State -1, Damage Cancel]
type = ChangeState
value = 950
triggerall = command = "DC"
triggerall = power >= 1000
triggerall = alive
trigger1 = (stateno = [5000,5040]) || (stateno = [5070,5081]) || (stateno = 5050 && time < 10)
trigger1 = var(14) = 1
