extends Control
## Shown after Grumbleroot is defeated -- the game's ending beat.

@onready var title_button: Button = $VBox/Buttons/TitleButton
@onready var quit_button: Button = $VBox/Buttons/QuitButton


func _ready() -> void:
	title_button.pressed.connect(_on_title_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	title_button.grab_focus()


func _on_title_pressed() -> void:
	SceneTransition.goto_scene("res://scenes/ui/TitleScreen.tscn")


func _on_quit_pressed() -> void:
	get_tree().quit()
