extends Node
## Tracks player health, checkpoints, and level flow across scene changes.
## "True" Game Over (see GameOverScreen.tscn) only happens if health hits
## zero during a boss fight; dying in a regular level just respawns you at
## the last checkpoint with full health, per the "engaging, not punishing"
## difficulty goal.

signal health_changed(health: int, max_health: int)
signal game_over
signal level_completed(level_path: String)

const LEVEL_ORDER: Array[String] = [
	"res://scenes/levels/Level1_LadleMeadow.tscn",
	"res://scenes/levels/Level2_WhisperingGrove.tscn",
	"res://scenes/levels/Level3_FizzyFalls.tscn",
	"res://scenes/levels/Level4_SnoringStump.tscn",
	"res://scenes/levels/Level5_BrambleTower.tscn",
]

var max_health: int = 5
var health: int = 5
var checkpoint_position: Vector2 = Vector2.ZERO
var checkpoint_level_path: String = ""
var current_level_path: String = ""
var is_boss_level: bool = false
var game_over_pending: bool = false


func take_damage(amount: int) -> void:
	if game_over_pending:
		return
	health = max(health - amount, 0)
	health_changed.emit(health, max_health)
	if health <= 0:
		_handle_defeat()


func heal(amount: int) -> void:
	health = min(health + amount, max_health)
	health_changed.emit(health, max_health)


func set_checkpoint(pos: Vector2, level_path: String) -> void:
	checkpoint_position = pos
	checkpoint_level_path = level_path


func register_level(level_path: String, boss_level: bool) -> void:
	current_level_path = level_path
	is_boss_level = boss_level


func get_respawn_position(default_position: Vector2) -> Vector2:
	if checkpoint_level_path == current_level_path:
		return checkpoint_position
	return default_position


func _handle_defeat() -> void:
	if is_boss_level:
		game_over_pending = true
		game_over.emit()
		SceneTransition.goto_scene("res://scenes/ui/GameOverScreen.tscn")
	else:
		respawn()


func respawn() -> void:
	health = max_health
	health_changed.emit(health, max_health)
	get_tree().reload_current_scene()


func retry_from_game_over() -> void:
	game_over_pending = false
	health = max_health
	health_changed.emit(health, max_health)
	SceneTransition.goto_scene(current_level_path)


func start_new_game() -> void:
	game_over_pending = false
	health = max_health
	checkpoint_position = Vector2.ZERO
	checkpoint_level_path = ""
	SceneTransition.goto_scene(LEVEL_ORDER[0])


func complete_level() -> void:
	level_completed.emit(current_level_path)
	var idx: int = LEVEL_ORDER.find(current_level_path)
	if idx == -1 or idx == LEVEL_ORDER.size() - 1:
		SceneTransition.goto_scene("res://scenes/ui/VictoryScreen.tscn")
	else:
		checkpoint_level_path = ""
		checkpoint_position = Vector2.ZERO
		SceneTransition.goto_scene(LEVEL_ORDER[idx + 1])
