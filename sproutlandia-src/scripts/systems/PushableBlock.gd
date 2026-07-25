extends CharacterBody2D
## A block the player can push by standing next to it. Slides away from
## whichever side the player is touching; stops on walls or when the
## player lets go. Built procedurally by LevelBase.spawn_pushable_block.

@export var push_speed: float = 60.0

@onready var push_zone: Area2D = $PushZone

var _push_direction: Vector2 = Vector2.ZERO


func _ready() -> void:
	set_collision_layer_value(1, true)  # solid to the player (world layer)
	set_collision_layer_value(9, true)  # pushable_block (pressure plates)
	set_collision_mask_value(1, true)
	push_zone.collision_layer = 0
	push_zone.collision_mask = 0
	push_zone.set_collision_mask_value(2, true)
	push_zone.body_entered.connect(_on_push_zone_body_entered)
	push_zone.body_exited.connect(_on_push_zone_body_exited)


func _physics_process(_delta: float) -> void:
	velocity = _push_direction * push_speed
	move_and_slide()


func _on_push_zone_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		var away: Vector2 = global_position - body.global_position
		if abs(away.x) > abs(away.y):
			_push_direction = Vector2(sign(away.x), 0.0)
		else:
			_push_direction = Vector2(0.0, sign(away.y))


func _on_push_zone_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		_push_direction = Vector2.ZERO
