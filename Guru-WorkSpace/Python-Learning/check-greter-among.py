num1 = int(input("Enter the num1\n"))  # 5 , # 10
num2 = int(input("Enter the num2\n"))  # 3 , # 12
num3 = int(input("Enter the num3\n"))  # 2 , # 11

if (num1>= num2 and num1 >= num3):
    print("Gratest Number:", num1)
elif (num2 >= num3 and num2 >= num1):
    print(num2)
else:
    print("Gratest Number:",num3)