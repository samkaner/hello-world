extends LevelBase
## Intro platforming level: teaches running, jumping, and the hover across
## a gap too wide for a plain jump. One Bonk-Bug on the ground, one perched
## on a small rise.

const BONK_BUG_SCENE := preload("res://scenes/entities/enemies/BonkBug.tscn")


func _build_level() -> void:
	setup_parallax_background("ladle_meadow")
	set_camera_bounds(Rect2(0, 0, 1600, 270))

	build_floor([
		Rect2(0, 220, 650, 60),
		Rect2(760, 220, 840, 60),
	])
	PlatformBuilder.build_platforms(self, [
		Rect2(930, 195, 100, 20),
	], ground_texture)

	spawn_kill_zone(Rect2(0, 300, 1600, 40))
	spawn_goal(Rect2(1520, 150, 50, 70))

	_spawn_enemy(Vector2(500, 200))
	_spawn_enemy(Vector2(980, 180))


func _spawn_enemy(pos: Vector2) -> void:
	var bug := BONK_BUG_SCENE.instantiate()
	bug.position = pos
	add_child(bug)
