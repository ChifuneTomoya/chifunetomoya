import boto3

s3 = boto3.client('s3')
bucket_name = 'tomoya-buket'
key = '智哉_20250623014701.txt'

response = s3.get_object(Bucket=bucket_name, Key=key)
text = response['Body'].read().decode('utf-8')
print(text)