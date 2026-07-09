extends Area2D
## Starts a boss fight once the player walks in (built procedurally by
## LevelBase.spawn_boss_arena). Triggers exactly once.

@export var boss_path: NodePath

var _triggered: bool = false


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if _triggered or not body.is_in_group("player"):
		return
	var boss := get_node_or_null(boss_path)
	if boss and boss.has_method("start_battle"):
		_triggered = true
		boss.start_battle()
