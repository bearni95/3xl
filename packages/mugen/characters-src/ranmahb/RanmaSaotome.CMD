;-| Super Motions |--------------------------------------------------------

; QCFx2
[Command]
name = "QCFX2_a"
command = ~D, DF, F, D, DF, F, a
time = 30

[Command]
name = "QCFX2_b"
command = ~D, DF, F, D, DF, F, b
time = 30

[Command]
name = "QCFX2_x"
command = ~D, DF, F, D, DF, F, x
time = 30

[Command]
name = "QCFX2_y"
command = ~D, DF, F, D, DF, F, y
time = 30

[Command]
name = "QCBX2_a"
command = ~F, B, a
time = 30

[Command]
name = "QCBX2_b"
command = ~F, B, b
time = 30

[Command] 
name = "KTA"   ;Same name as above
command = ~D, DF, F, B, y
time = 20

;-| Special Motions |------------------------------------------------------
;-----------------
; QCF
[Command]
name = "QCF_a"
command = ~D, DF, F, a

[Command]
name = "QCF_b"
command = ~D, DF, F, b

[Command]
name = "QCF_c"
command = ~D, DF, F, c

[Command]
name = "QCF_x"
command = ~D, DF, F, x

[Command]
name = "QCF_y"
command = ~D, DF, F, y

[Command]
name = "QCF_z"
command = ~D, DF, F, z

[Command]
name = "amaguri_x"
command = ~x, x, x
time = 15

[Command]
name = "amaguri_y"
command = ~y, y, y
time = 15

;-----------------
; QCB
[Command]
name = "QCB_a"
command = ~D, DB, B, a

[Command]
name = "QCB_b"
command = ~D, DB, B, b

[Command]
name = "QCB_c"
command = ~D, DB, B, c

[Command]
name = "QCB_x"
command = ~D, DB, B, x

[Command]
name = "QCB_y"
command = ~D, DB, B, y

[Command]
name = "QCB_z"
command = ~D, DB, B, z

;-----------------
; Uppercut
[Command]
name = "uppercut_a"
command = ~F, D, DF, a

[Command]
name = "uppercut_b"
command = ~F, D, DF, b

[Command]
name = "uppercut_c"
command = ~F, D, DF, c

[Command]
name = "uppercut_x"
command = ~F, D, DF, x

[Command]
name = "uppercut_y"
command = ~F, D, DF, y

[Command]
name = "uppercut_z"
command = ~F, D, DF, z



;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF";Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB";Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = a+b
time = 1

[Command]
name = "ab"
command = a+b
time = 1

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "fwd_a"
command = /F,a
time = 1

[Command]
name = "fwd_b"
command = /F,b
time = 1

[Command]
name = "fwd_c"
command = /F,c
time = 1

[Command]
name = "fwd_x"
command = /F,x
time = 1

[Command]
name = "fwd_y"
command = /F,y
time = 1

[Command]
name = "fwd_z"
command = /F,z
time = 1

[Command]
name = "back_a"
command = /B,a
time = 1

[Command]
name = "back_b"
command = /B,b
time = 1

[Command]
name = "back_c"
command = /B,c
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
name = "fwd_ab"
command = /F, a+b
time = 1

[Command]
name = "back_ab"
command = /B, a+b
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
name = "holdup";Required (do not remove)
command = /$U
time = 1

[Command]
name = "holddown";Required (do not remove)
command = /$D
time = 1


;---------------------------------------------------------------------------
; 2. State entry
; --------------
; This is where you define what commands bring you to what states.
;
; Each state entry block looks like:
;   [State -1]                  ;Don't change this
;   type = ChangeState          ;Don't change this
;   value = new_state_number
;   trigger1 = command = "command_name"
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



;---------------------------------------------------------------------------
;=============================================================================
;---------------------------------------------------------------------------
; 飛竜昇天破（開始）
[State -1]
type = ChangeState
value = 3000
triggerall = var(59)!= 1
triggerall = command = "QCFX2_a"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;---------------------------------------------------------------------------
;Super Mouko Takabisha
[State -1]
type = ChangeState
value = 3200
triggerall = var(59)!= 1
triggerall = command = "QCFX2_x"
triggerall = power >= 1000
triggerall = numproj = 0
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact


;Kachuu Tenshin Amaguriken
[State -1]
type = ChangeState
value = 3100
triggerall = var(59)!= 1
triggerall = command = "KTA"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact


;===========================================================================
;Amaguriken
[State -1,]
type = ChangeState
value = 1000
triggerall = var(59)!= 1
triggerall = command = "amaguri_x"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno = 200
trigger3 = Time >= 4
trigger4 = stateno =950
trigger4 = movecontact

;---------------------------------------------------------------------------
;Amaguriken2
[State -1,]
type = ChangeState
value = 1010
triggerall = var(59)!= 1
triggerall = command = "amaguri_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno = 210
trigger3 = Time >= 6
trigger4 = stateno =950
trigger4 = movecontact

;===========================================================================
; Hiryuu Shoten Ha
[State -1]
type = ChangeState
value = 1100
triggerall = var(59)!= 1
triggerall = command = "uppercut_x"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

; Hiryuu Shoten Ha2
[State -1]
type = ChangeState
value = 1110
triggerall = var(59)!= 1
triggerall = command = "uppercut_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;===========================================================================
;Mouko Takabisha
[State -1]
type = ChangeState
value = 1200
triggerall = var(59)!= 1
triggerall = command = "QCF_x"
triggerall = numproj = 0
trigger1 = statetype != A
trigger1 = ctrl=1


;---------------------------------------------------------------------------
;Mouko Takabisha fast
[State -1]
type = ChangeState
value = 1210
triggerall = var(59)!= 1
triggerall = command = "QCF_y"
triggerall = numproj = 0
trigger1 = statetype != A
trigger1 = ctrl=1




[State -1]
type = ChangeState
value = 970
triggerall = var(59) != 1
triggerall = command = "holddown"
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;Stand_Throw (close dir+b)
; Complicated? Skip the throws and look at stand_a, etc, first.
; This is disabled right now. Remove the "null;" below when you
; want to use it.
[State -1, Kung Fu Throw]
type = ChangeState
value = 800
triggerall = var(59) != 1
triggerall = command = "a"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 5
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 7
trigger2 = (p2statetype = S) || (p2statetype = C)
trigger2 = p2movetype != H

;===========================================================================
;---------------------------------------------------------------------------

;---------------------------------------------------------------------------
;Stand_A
[State -1]
type = ChangeState
value = 230
triggerall = command = "a";Place name of command here
triggerall = command != "holddown";Standing moves should have this line
 ;The following is true if Player is in stand state, and has control
trigger1 = statetype = S
trigger1 = ctrl = 1
 ;Uncomment the following if you want to be able to do a Stand_A rapidly
;trigger2 = stateno = 200
;trigger2 = time >= 7

[State -1]
type = ChangeState
value = 240
triggerall = command = "b";Place name of command here
triggerall = command != "holddown";Standing moves should have this line
 ;The following is true if Player is in stand state, and has control
trigger1 = statetype = S
trigger1 = ctrl = 1
 ;Uncomment the following if you want to be able to do a Stand_A rapidly
;trigger2 = stateno = 200
;trigger2 = time >= 7

;---------------------------------------------------------------------------
;Stand_X
[State -1]
type = ChangeState
value = 200
triggerall = command = "x";Place name of command here
triggerall = command != "holddown";Standing moves should have this line
 ;The following is true if Player is in stand state, and has control
trigger1 = statetype = S
trigger1 = ctrl = 1
 ;Uncomment the following if you want to be able to do a Stand_A rapidly
;trigger2 = stateno = 200
;trigger2 = time >= 7

;---------------------------------------------------------------------------
;Stand_Y
[State -1]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
 ;Uncomment the following if you want to be able to "chain" the attack
 ;from a Stand_A (state 200)
;trigger2 = stateno = 200
;trigger2 = movecontact = 1  ;If move hits, or is guarded by opponent

;---------------------------------------------------------------------------
;Crouch_X
[State -1]
type = ChangeState
value = 420
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl = 1

[State -1]
type = ChangeState
value = 420
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl = 1
;---------------------------------------------------------------------------
;Crouch_Y
[State -1]
type = ChangeState
value = 430
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl = 1

[State -1]
type = ChangeState
value = 440
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;Jump_A
[State -1]
type = ChangeState
value = 600
trigger1 = command = "x"
trigger1 = statetype = A
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;Jump_B
[State -1]
type = ChangeState
value = 600
trigger1 = command = "y"
trigger1 = statetype = A
trigger1 = ctrl = 1
;---------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 630
trigger1 = command = "a"
trigger1 = statetype = A
trigger1 = ctrl = 1

;Jump_X
[State -1]
type = ChangeState
value = 640
trigger1 = command = "b"
trigger1 = statetype = A
trigger1 = ctrl = 1


;----------------------------------------------------------------------------------
;====================================================================================

[State -1]
type = ChangeState
value = 1100
triggerall = var(59) >= 1 && roundstate = 2
trigger1 = var(57) != 12
trigger1 = var(57) != 13
trigger1 = statetype != A
trigger1 = enemynear(var(58)),statetype = A
trigger1 = p2bodydist X = [0,34]
trigger1 = p2bodydist Y = [-50,-30]
trigger1 = ctrl || stateno = 100 || stateno = 18 || stateno = 19 || stateno = 120 || (stateno = [130,131])
trigger1 = random <= var(59) * 100

;---------------------------------------------------------------------------
; 飛竜昇天破（強）
[State -1]
type = ChangeState
value = 1110
triggerall = var(59) >= 1 && roundstate = 2
trigger1 = var(57) != 12
trigger1 = var(57) != 13
trigger1 = statetype != A
trigger1 = enemynear(var(58)),statetype = A
trigger1 = p2bodydist X = [0,35]
trigger1 = (var(57) != 15 && (p2bodydist Y = [-50,-30])) || (var(57) = 15 && p2bodydist Y <= -10)
trigger1 = ctrl || stateno = 100 || stateno = 18 || stateno = 19 || stateno = 120 || (stateno = [130,131])
trigger1 = random <= var(59) * 100
trigger2 = var(57) = 7 || var(57) = 8
trigger2 = stateno = 240 || stateno = 440
trigger2 = movehit && (enemynear(var(58)),stateno = [5000,5099])
trigger2 = p2bodydist X = [0,21]
trigger2 = random <= 333
trigger3 = var(57) = 9
trigger3 = enemynear(var(58)),statetype = A
trigger3 = stateno = 230 && movehit && (enemynear(var(58)),stateno = [5000,5099])
trigger3 = p2bodydist X = [0,21]
trigger3 = random <= 333
trigger4 = var(57) = 11
trigger4 = stateno = 420 && movehit && (enemynear(var(58)),stateno = [5000,5099])
trigger4 = p2bodydist X = [0,21]
trigger4 = random <= 333


