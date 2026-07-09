extends Area2D
## One-way switch from top-down to platforming movement, used where Bramble
## Tower's approach corridor ends and the climb begins. Built by
## LevelBase.spawn_platform_mode_zone.


func _ready() -> void:
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		body.top_down_mode = false
