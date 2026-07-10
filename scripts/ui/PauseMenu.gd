extends CanvasLayer
## Self-contained pause overlay -- instanced into every level. Listens for
## the "pause" action itself (even while the tree is paused) and toggles
## get_tree().paused.

@onready var panel: Control = $Panel
@onready var resume_button: Button = $Panel/VBox/Buttons/ResumeButton
@onready var quit_button: Button = $Panel/VBox/Buttons/QuitButton


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	panel.visible = false
	resume_button.pressed.connect(_toggle_pause)
	quit_button.pressed.connect(_on_quit_pressed)


func _input(event: InputEvent) -> void:
	# _input (not _unhandled_input) so nothing in the GUI can eat the
	# pause press before it reaches us.
	if event.is_action_pressed("pause"):
		_toggle_pause()
		get_viewport().set_input_as_handled()


func _toggle_pause() -> void:
	var now_paused := not get_tree().paused
	get_tree().paused = now_paused
	panel.visible = now_paused
	if now_paused:
		resume_button.grab_focus()


func _on_quit_pressed() -> void:
	# Back to the title screen, not out of the app -- quitting the whole
	# game from pause is too easy to hit with a controller.
	get_tree().paused = false
	panel.visible = false
	SceneTransition.goto_scene("res://scenes/ui/TitleScreen.tscn")
