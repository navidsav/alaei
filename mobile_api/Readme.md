UserController:
    - Login
	- Register
	- ForgotPassword
	
CarController:
	- GetRegisteredCars
	- RegisterCar(DevicePinCode,DeviceSerialNumber,NumberPlate,Name,Model,ModelDetail(تیپ),YearOfProd,...)
		=> Actually this EndPoint should Check device first(SerialNumber and PinCode) and add this device(GPS) to the car
	- EditCarProperties(NumberPlate,Name,Model,ModelDetail(تیپ),YearOfProd,...)
	- DeleteCar
	- Get Routes(Get Points) (Params: DateTimeFrom , DateTimeTo, CarId)
	
	
Notifications(Log-Messages)Controller:
	- Get Car Commands Log(CarAlarm,OTA,...)
	- Get Car Notifications(Messages)
	- Get User Notifications(Messages)
	- 

ConstantController:
	=> this controller is using for basic informatoins like brand,car model, car names, car types , device types , ...
		and used for select boxes usually
	- Get Car Brands
	- Get Car Models
	- Get Car Model Details
	- Get Colors(Car)