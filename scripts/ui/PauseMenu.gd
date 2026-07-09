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


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		_toggle_pause()


func _toggle_pause() -> void:
	var now_paused := not get_tree().paused
	get_tree().paused = now_paused
	panel.visible = now_paused
	if now_paused:
		resume_button.grab_focus()


func _on_quit_pressed() -> void:
	get_tree().quit()
