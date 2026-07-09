extends LevelBase
## Platforming level with a bounce pad that launches the player up to a
## hidden top-down alcove (a bonus heal, entirely optional) before
## continuing on to a mid-level checkpoint and the goal.

const BONK_BUG_SCENE := preload("res://scenes/entities/enemies/BonkBug.tscn")


func _build_level() -> void:
	setup_parallax_background("fizzy_falls")
	set_camera_bounds(Rect2(0, 0, 1400, 270))

	build_floor([
		Rect2(0, 220, 1400, 60),
	])
	PlatformBuilder.build_platforms(self, [
		Rect2(460, 120, 140, 20),
	], ground_texture)

	spawn_bounce_pad(Rect2(490, 205, 60, 14))
	spawn_top_down_zone(Rect2(460, 90, 140, 40))
	spawn_heal_pickup(Rect2(518, 98, 24, 24))

	spawn_checkpoint(Rect2(740, 190, 20, 30))
	spawn_kill_zone(Rect2(0, 300, 1400, 40))
	spawn_goal(Rect2(1330, 150, 50, 70))

	var bug := BONK_BUG_SCENE.instantiate()
	bug.position = Vector2(900, 200)
	add_child(bug)
