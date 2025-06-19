const awsconfig = {
  Auth: {
    region: 'ap-northeast-1',
    userPoolId: 'ap-northeast-1_QJgb4CpUW',
    userPoolWebClientId: '74qvhbo21o5s72jerfltvk0slq',  // 新しいクライアントID
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH', // SRP認証フローに変更
    oauth: {
      domain: 'ap-northeast-1qjgb4cpuw.auth.ap-northeast-1.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'https://zg8m2euiyd.ap-northeast-1.awsapprunner.com',
      redirectSignOut: 'https://zg8m2euiyd.ap-northeast-1.awsapprunner.com',
      responseType: 'code',
    },
  },
};

export default awsconfig;
