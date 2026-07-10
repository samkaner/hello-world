extends Control
## The funny Game Over screen -- shown only when health hits zero during a
## boss fight (see GameManager._handle_defeat). Retry restarts the current
## boss level with full health rather than the whole game, per the
## "engaging, not punishing" difficulty goal.

const JOKES: Array[String] = [
	"You have transcended to a non-physical form. 10/10 hover technique, 0/10 landing.",
	"Grumbleroot appreciates the hustle, but not enough to spare a heart.",
	"Pip has been temporarily replaced by a slightly sadder acorn.",
	"The ladle has been confiscated pending review.",
	"Somewhere, a stump is having the best day of its life.",
	"Local sprout attempts heroics, settles for a nice lie-down instead.",
]

@onready var joke_label: Label = $VBox/JokeLabel
@onready var retry_button: Button = $VBox/Buttons/RetryButton
@onready var quit_button: Button = $VBox/Buttons/QuitButton


func _ready() -> void:
	Sfx.stop_music()
	Sfx.play("game_over")
	joke_label.text = JOKES[randi() % JOKES.size()]
	retry_button.pressed.connect(_on_retry_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	retry_button.grab_focus()


func _on_retry_pressed() -> void:
	GameManager.retry_from_game_over()


func _on_quit_pressed() -> void:
	get_tree().quit()
