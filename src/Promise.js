// 任务进行中
const PENDING = 'PENDING';
// 任务完成
const FULFILLED = 'FULFILLED';
// 任务失败
const REJECTED = 'REJECTED';


class PromiseSource {

  // 状态
  status = PENDING
  // 任务成功后的值
  value = void 0
  // 任务失败的原因（可能是reject传入的，也可能来自try catch）
  reason = void 0
  // 任务成功后需要处理的队列
  onResolveCallbacks = []
  // 任务失败后需要处理的队列
  onRejectCallbacks = []

  constructor(task) {
    // 异步任务成功的回调
    const resolve = (value) => {
      try {
        this.status = FULFILLED
        this.value = value
        while (this.onResolveCallbacks.length) {
          this.onRejectCallbacks.shift()
          const fun = this.onResolveCallbacks.shift()
          fun()
        }
      } catch (e) {
        reject(e)
      }
    }
    // 异步任务失败的回调
    const reject = (reason) => {
      this.status = REJECTED
      this.reason = reason
      if (!this.onRejectCallbacks.length || typeof this.onRejectCallbacks[0] !== 'function') {
        throw new Error(reason)
      }
      let fun = this.onRejectCallbacks.shift()
      if (fun) {
        this.onResolveCallbacks.shift()
        fun()
      }
      resolve(this.value)
    }
    // 开始任务
    try {
      task(resolve, reject)
    } catch (err) {
      console.error(err);
      reject(err)
    }
  }

  then(onResolveCallback, onRejectCallback) {
    return new PromiseSource((resolve, reject) => {
      // 返回当前的Promise，链式调用
      // 任务已经成功，直接调用
      if (this.status === FULFILLED) {
        try {
          this.value = onResolveCallback(this.value)
          resolve(this.value)
        } catch (err) {
          reject(err)
        }
      }
      // 任务已经失败，直接调用
      else if (this.status === REJECTED) {
        if (onRejectCallback) {
          this.value = onRejectCallback(this.reason)
          this.status = FULFILLED
        }
      }
      // 任务未完成，添加到队列等待处理
      else if (this.status === PENDING) {
        this.onResolveCallbacks.push(() => {
          try {
            this.value = onResolveCallback(this.value)
            resolve(this.value)
          } catch (err) {
            reject(err)
          }
        })
        this.onRejectCallbacks.push(onRejectCallback && (() => {
          this.status = FULFILLED
          this.value = onRejectCallback()
          resolve(this.value)
        }))
      }
    })
  }

  catch(onRejectCallback) {
    // 任务已经失败，直接调用
    if (this.status === REJECTED) {
      this.value = onRejectCallback(this.reason)
    }
    // 任务未完成，添加到队列等待处理
    else if (this.status === PENDING) {
      this.onResolveCallbacks.push(() => { })
      this.onRejectCallbacks.push(() => {
        this.value = onRejectCallback(this.reason)
        this.status = FULFILLED
      })
    }
    return this
  }

}

PromiseSource.all = function (taskList) {
  return new PromiseSource((resolve, reject) => {
    const valueList = []
    if (!Array.isArray(taskList)) {
      throw new TypeError("PromiseSource.all param type must be a Array")
    }
    if (taskList.length === 0) {
      resolve(valueList)
      return
    }
    let successCount = 0
    for (let i = 0; i < taskList.length; i++) {
      const task = taskList[i]
      if (task instanceof PromiseSource) {
        task.then(res => {
          valueList[i] = res
          if (++successCount === taskList.length) {
            resolve(valueList)
          }
        }, reject)
      } else {
        valueList[i] = task
        if (++successCount === taskList.length) {
          resolve(valueList)
        }
      }
    }
  })
}

const p = new PromiseSource((resolve, reject) => {
  setTimeout(() => {
    reject('s1')
  }, 1000)
}).then(res => {
  return 3333
})
// const p2 = new PromiseSource((resolve, reject) => {
//   setTimeout(() => {
//     resolve('error')
//   }, 1000)
// })

const pp = PromiseSource.all([p])
pp.then(res => {
  console.log(res);
}, err => {
  console.log(333);
})