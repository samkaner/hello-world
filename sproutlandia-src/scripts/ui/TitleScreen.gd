extends Control


func _ready() -> void:
	Sfx.play_music("overworld")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("jump") or event.is_action_pressed("ui_accept"):
		GameManager.start_new_game()
