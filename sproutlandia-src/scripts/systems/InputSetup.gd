extends Node
## Defines every custom input action in code (keyboard + joypad) so bindings
## are guaranteed correct without hand-authored project.godot input resources.
##
## macOS Switch Pro Controller / Joy-Con note: Godot's JoyButton enum follows
## the SDL "standard gamepad" layout, which mirrors Xbox physical button
## positions rather than Nintendo's printed face-button labels. On a Switch
## controller the physical bottom face button is printed "B" but sits in the
## "A" slot of the standard layout, so JOY_BUTTON_A is what fires for it.
## Mapping used below:
##   Switch B (bottom face) -> JOY_BUTTON_A     -> "jump"
##   Switch Y (left face)   -> JOY_BUTTON_X     -> "attack"
##   Switch +  (start)      -> JOY_BUTTON_START -> "pause"

func _ready() -> void:
	_setup_action("move_left", [KEY_LEFT, KEY_A], [JOY_BUTTON_DPAD_LEFT])
	_setup_action("move_right", [KEY_RIGHT, KEY_D], [JOY_BUTTON_DPAD_RIGHT])
	_setup_action("move_up", [KEY_UP, KEY_W], [JOY_BUTTON_DPAD_UP])
	_setup_action("move_down", [KEY_DOWN, KEY_S], [JOY_BUTTON_DPAD_DOWN])
	_setup_action("jump", [KEY_SPACE, KEY_Z], [JOY_BUTTON_A])
	_setup_action("attack", [KEY_X], [JOY_BUTTON_X])
	# Both + (start) and - (back): macOS occasionally reserves one of the
	# small buttons, so give pause a fallback.
	_setup_action("pause", [KEY_ESCAPE], [JOY_BUTTON_START, JOY_BUTTON_BACK])

	_setup_axis("move_left", "move_right", JOY_AXIS_LEFT_X)
	_setup_axis("move_up", "move_down", JOY_AXIS_LEFT_Y)

	# Menus (Retry/Quit buttons etc.) run on Godot's built-in ui_* actions,
	# which don't reliably include gamepad bindings -- add them so focused
	# buttons can be pressed and navigated from the controller.
	_setup_action("ui_accept", [], [JOY_BUTTON_A])
	_setup_action("ui_cancel", [], [JOY_BUTTON_B])
	_setup_action("ui_left", [], [JOY_BUTTON_DPAD_LEFT])
	_setup_action("ui_right", [], [JOY_BUTTON_DPAD_RIGHT])
	_setup_action("ui_up", [], [JOY_BUTTON_DPAD_UP])
	_setup_action("ui_down", [], [JOY_BUTTON_DPAD_DOWN])
	_setup_axis("ui_left", "ui_right", JOY_AXIS_LEFT_X)
	_setup_axis("ui_up", "ui_down", JOY_AXIS_LEFT_Y)

func _setup_action(action_name: String, keys: Array, joy_buttons: Array) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for key in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = key
		InputMap.action_add_event(action_name, ev)
	for button in joy_buttons:
		var ev := InputEventJoypadButton.new()
		ev.button_index = button
		InputMap.action_add_event(action_name, ev)

func _setup_axis(negative_action: String, positive_action: String, axis: int) -> void:
	var neg := InputEventJoypadMotion.new()
	neg.axis = axis
	neg.axis_value = -1.0
	InputMap.action_add_event(negative_action, neg)

	var pos := InputEventJoypadMotion.new()
	pos.axis = axis
	pos.axis_value = 1.0
	InputMap.action_add_event(positive_action, pos)
