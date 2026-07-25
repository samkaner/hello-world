extends LevelBase
## A single top-down dungeon room: push a block onto the pressure plate to
## open the door blocking the way to the goal, fighting off Twiglets along
## the way.

const TWIGLET_SCENE := preload("res://scenes/entities/enemies/Twiglet.tscn")


func _build_level() -> void:
	setup_parallax_background("whispering_grove")
	set_camera_bounds(Rect2(0, 0, 480, 270))

	build_walls([
		Rect2(0, 0, 480, 16),
		Rect2(0, 254, 480, 16),
		Rect2(0, 0, 16, 270),
		Rect2(464, 0, 16, 270),
		Rect2(292, 16, 16, 104),
		Rect2(292, 152, 16, 102),
	])

	var door := spawn_door(Rect2(292, 120, 16, 32))
	var plate := spawn_pressure_plate(Rect2(136, 76, 28, 28))
	plate.activated.connect(door.open)
	spawn_pushable_block(Rect2(138, 178, 24, 24))

	spawn_goal(Rect2(430, 110, 24, 50))

	_spawn_enemy(Vector2(200, 220))
	_spawn_enemy(Vector2(380, 135))


func _spawn_enemy(pos: Vector2) -> void:
	var twiglet := TWIGLET_SCENE.instantiate()
	twiglet.position = pos
	add_child(twiglet)
