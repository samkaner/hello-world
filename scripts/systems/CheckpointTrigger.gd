extends Area2D
## Placed mid-level (built procedurally by LevelBase.spawn_checkpoint);
## saves the respawn position when the player passes through.


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	collision_layer = 0
	collision_mask = 0
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		if GameManager.checkpoint_position != global_position:
			Sfx.play("checkpoint")
		GameManager.set_checkpoint(global_position, GameManager.current_level_path)
