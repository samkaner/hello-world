extends Area2D
## A "fell into a pit" zone (built procedurally by LevelBase.spawn_kill_zone).
## Zeroes the player's health, which routes through the normal defeat flow:
## respawn at checkpoint in a regular level, Game Over during a boss fight.


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player") and body.has_method("take_damage"):
		body.take_damage(GameManager.health)
